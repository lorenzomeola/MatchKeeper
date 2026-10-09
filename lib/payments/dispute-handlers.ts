import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdminDispute } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { buildDisputeEvidence } from "./dispute-evidence-data";
import { retransferAmount, reversibleAmount } from "./disputes";

// Disputas cerradas sin pérdida de dinero: se restaura el estado de pago de la reserva.
const NOT_LOST = ["won", "warning_closed"];

const chargeIdOf = (d: Stripe.Dispute) => (typeof d.charge === "string" ? d.charge : d.charge.id);
const dueByOf = (d: Stripe.Dispute) => (d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : null);

async function logEvent(bookingId: string | null, type: string, data: Record<string, unknown>, actorId: string | null = null) {
  if (!bookingId) return;
  await createAdminClient().from("booking_events").insert({ booking_id: bookingId, type, actor_id: actorId, data });
}

/** Prepara y guarda la evidencia; un admin la revisa y la envía. Si falla, se puede regenerar desde el panel. */
export async function generateEvidenceFor(disputeRowId: string, bookingId: string) {
  const evidence = await buildDisputeEvidence(bookingId);
  await createAdminClient()
    .from("disputes")
    .update({ evidence, evidence_generated_at: new Date().toISOString() })
    .eq("id", disputeRowId);
}

export async function handleDisputeEvent(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute;
  switch (event.type) {
    case "charge.dispute.created":
      return onCreated(dispute);
    case "charge.dispute.updated":
      return onUpdated(dispute);
    case "charge.dispute.closed":
      return onClosed(dispute);
    case "charge.dispute.funds_withdrawn":
      return onFunds(dispute, "funds_withdrawn_at", "dispute_funds_withdrawn");
    case "charge.dispute.funds_reinstated":
      return onFunds(dispute, "funds_reinstated_at", "dispute_funds_reinstated");
    default:
      return;
  }
}

async function onCreated(d: Stripe.Dispute) {
  const admin = createAdminClient();
  const chargeId = chargeIdOf(d);
  const intentId = typeof d.payment_intent === "string" ? d.payment_intent : (d.payment_intent?.id ?? null);
  // Por cargo, y por intención de pago si la reserva aún no guardó el id del cargo.
  const lookup = admin.from("bookings").select("id, payment_status");
  const { data: booking } = await (intentId ? lookup.or(`stripe_charge_id.eq.${chargeId},stripe_payment_intent_id.eq.${intentId}`) : lookup.eq("stripe_charge_id", chargeId)).limit(1).maybeSingle();

  // Si otro evento (p. ej. fondos retirados) ya registró la disputa a la vez, no se repite el trabajo.
  const { data: row, error } = await admin
    .from("disputes")
    .upsert(
      {
        stripe_dispute_id: d.id,
        stripe_charge_id: chargeId,
        booking_id: booking?.id ?? null,
        reason: d.reason,
        status: d.status,
        amount_pence: d.amount,
        due_by: dueByOf(d),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_dispute_id", ignoreDuplicates: true },
    )
    .select("id, prev_payment_status")
    .maybeSingle();
  if (error) throw error;
  if (!row) return;

  const dueBy = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000) : null;
  defer(() => notifyAdminDispute({ stripeId: d.id, amountPence: d.amount, reason: d.reason, status: d.status, dueBy, matched: Boolean(booking) }));

  if (!booking) return;
  if (booking.payment_status !== "disputed") {
    await admin.from("disputes").update({ prev_payment_status: booking.payment_status }).eq("id", row.id);
    await admin.from("bookings").update({ payment_status: "disputed" }).eq("id", booking.id);
  }
  await logEvent(booking.id, "dispute_created", { dispute: d.id, reason: d.reason, amount: d.amount });

  try {
    await generateEvidenceFor(row.id, booking.id);
  } catch (e) {
    console.error(`dispute evidence generation failed for ${d.id}`, e);
  }
}

async function onUpdated(d: Stripe.Dispute) {
  const admin = createAdminClient();
  const { data: row } = await admin.from("disputes").select("id").eq("stripe_dispute_id", d.id).maybeSingle();
  if (!row) return onCreated(d);
  await admin
    .from("disputes")
    .update({ status: d.status, reason: d.reason, due_by: dueByOf(d), updated_at: new Date().toISOString() })
    .eq("id", row.id);
}

async function onFunds(d: Stripe.Dispute, column: "funds_withdrawn_at" | "funds_reinstated_at", eventType: string) {
  const admin = createAdminClient();
  // Los eventos pueden llegar casi a la vez y en cualquier orden: si aún no existe la disputa se registra primero.
  const { data: existing } = await admin.from("disputes").select("id").eq("stripe_dispute_id", d.id).maybeSingle();
  if (!existing) await onCreated(d);
  const { data: row } = await admin
    .from("disputes")
    .update({ [column]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("stripe_dispute_id", d.id)
    .select("booking_id")
    .maybeSingle();
  await logEvent(row?.booking_id ?? null, eventType, { dispute: d.id });
}

async function onClosed(d: Stripe.Dispute) {
  const admin = createAdminClient();
  let { data: row } = await admin
    .from("disputes")
    .select("id, booking_id, prev_payment_status, reversed_pence, retransferred_at, stripe_dispute_id")
    .eq("stripe_dispute_id", d.id)
    .maybeSingle();
  if (!row) {
    await onCreated(d);
    ({ data: row } = await admin
      .from("disputes")
      .select("id, booking_id, prev_payment_status, reversed_pence, retransferred_at, stripe_dispute_id")
      .eq("stripe_dispute_id", d.id)
      .maybeSingle());
  }
  if (!row) throw new Error("Dispute not found");

  await admin
    .from("disputes")
    .update({ status: d.status, outcome: d.status, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  await logEvent(row.booking_id, d.status === "lost" ? "dispute_lost" : "dispute_closed", { dispute: d.id, outcome: d.status });

  if (!NOT_LOST.includes(d.status) || !row.booking_id) return;

  await admin
    .from("bookings")
    .update({ payment_status: row.prev_payment_status ?? "released" })
    .eq("id", row.booking_id)
    .eq("payment_status", "disputed");
  await settleWon(row);
}

/** Disputa ganada: lo que se le quitó al portero (reversión o descuentos) se le devuelve y sus deudas de esta disputa se cancelan. */
async function settleWon(row: {
  id: string;
  booking_id: string;
  reversed_pence: number;
  retransferred_at: string | null;
  stripe_dispute_id: string;
}) {
  const admin = createAdminClient();
  const { data: debts } = await admin.from("keeper_debts").select("recovered_pence").eq("dispute_id", row.id);
  const recovered = (debts ?? []).reduce((sum, x) => sum + x.recovered_pence, 0);
  const owed = retransferAmount({ reversedPence: row.reversed_pence, debtRecoveredPence: recovered });

  if (owed > 0 && !row.retransferred_at) {
    const { data: booking } = await admin.from("bookings").select("goalkeeper_id").eq("id", row.booking_id).maybeSingle();
    const { data: account } = await admin
      .from("keeper_stripe_accounts")
      .select("stripe_account_id")
      .eq("profile_id", booking?.goalkeeper_id ?? "")
      .maybeSingle();
    if (!account) throw new Error("Keeper has no payout account to return the funds to");

    const transfer = await getStripe().transfers.create(
      {
        amount: owed,
        currency: "gbp",
        destination: account.stripe_account_id,
        transfer_group: `booking_${row.booking_id}`,
        metadata: { booking_id: row.booking_id, dispute: row.stripe_dispute_id, kind: "dispute_won_return" },
      },
      { idempotencyKey: `dispute-won:${row.stripe_dispute_id}` },
    );
    await admin
      .from("disputes")
      .update({ retransfer_id: transfer.id, retransferred_at: new Date().toISOString() })
      .eq("id", row.id);
    await logEvent(row.booking_id, "dispute_funds_returned_to_keeper", { dispute: row.stripe_dispute_id, amount: owed, transfer: transfer.id });
  }

  await admin.from("keeper_debts").update({ status: "waived", settled_at: new Date().toISOString() }).eq("dispute_id", row.id).eq("status", "open");
}

export type RecoveryResult = { kind: "reversed" | "debt" | "nothing"; pence: number; message: string };

/**
 * Recupera del portero lo que MatchKeeper le pagó por esa reserva. Primero intenta revertir la transferencia;
 * si Stripe no puede (p. ej. el portero ya retiró el dinero) queda como deuda, que se descuenta de sus próximos pagos.
 */
export async function recoverFromKeeper(disputeId: string, actorId: string | null): Promise<RecoveryResult> {
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: d } = await admin
    .from("disputes")
    .select("id, stripe_dispute_id, booking_id, reversed_pence")
    .eq("id", disputeId)
    .maybeSingle();
  if (!d?.booking_id) return { kind: "nothing", pence: 0, message: "This dispute is not linked to a booking." };

  const { count: debtCount } = await admin.from("keeper_debts").select("id", { count: "exact", head: true }).eq("dispute_id", d.id);
  if (d.reversed_pence > 0 || (debtCount ?? 0) > 0) return { kind: "nothing", pence: 0, message: "Recovery was already started." };

  const { data: booking } = await admin.from("bookings").select("goalkeeper_id, stripe_transfer_id").eq("id", d.booking_id).maybeSingle();
  if (!booking?.stripe_transfer_id) {
    await logEvent(d.booking_id, "dispute_nothing_to_recover", { dispute: d.stripe_dispute_id }, actorId);
    return { kind: "nothing", pence: 0, message: "The keeper was never paid for this booking, so there is nothing to recover." };
  }

  const transfer = await stripe.transfers.retrieve(booking.stripe_transfer_id);
  const amount = reversibleAmount(transfer.amount, transfer.amount_reversed);
  if (amount <= 0) return { kind: "nothing", pence: 0, message: "The payout was already reversed." };

  try {
    const reversal = await stripe.transfers.createReversal(
      transfer.id,
      { amount, metadata: { dispute: d.stripe_dispute_id, booking_id: d.booking_id } },
      { idempotencyKey: `dispute-reversal:${d.stripe_dispute_id}` },
    );
    await admin
      .from("disputes")
      .update({ reversal_id: reversal.id, reversed_pence: amount, reversal_error: null, recovered_at: new Date().toISOString() })
      .eq("id", d.id);
    await logEvent(d.booking_id, "keeper_funds_reversed", { dispute: d.stripe_dispute_id, amount, reversal: reversal.id }, actorId);
    return { kind: "reversed", pence: amount, message: "The payout was reversed from the keeper's account." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe could not reverse the payout";
    await admin.from("keeper_debts").insert({
      goalkeeper_id: booking.goalkeeper_id,
      dispute_id: d.id,
      amount_pence: amount,
      reason: `Disputed payment (${d.stripe_dispute_id}). The payout could not be reversed.`,
    });
    await admin.from("disputes").update({ reversal_error: message }).eq("id", d.id);
    await logEvent(d.booking_id, "keeper_debt_created", { dispute: d.stripe_dispute_id, amount, reason: message }, actorId);
    return { kind: "debt", pence: amount, message: "The payout could not be reversed. It is now a debt, deducted from the keeper's next payouts." };
  }
}
