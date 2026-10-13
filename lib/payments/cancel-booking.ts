import "server-only";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { defer, notifyBookingCancelled } from "@/lib/email/booking-emails";
import { notifyAdminPaymentProblem } from "@/lib/email/admin-emails";
import { cancellationWork, withoutMoney, type CancellationPlan } from "./money";
import { transferToKeeper } from "./release-booking";

export type CancelledBy = "team" | "keeper" | "admin" | "system";

/**
 * Cancela una reserva: primero se guarda el estado (strike, partido, candidaturas) de forma atómica y
 * después se mueve el dinero. Si Stripe falla, la cancelación ya consta y `processCancellationMoney` reanuda.
 */
export async function cancelBooking(input: {
  bookingId: string;
  by: CancelledBy;
  plan: CancellationPlan;
  reason: string;
  actorId: string | null;
}): Promise<{ cancelled: boolean; moneyPending: boolean }> {
  const admin = createAdminClient();
  // Candidaturas descartadas al llenarse el partido: las únicas que vuelven a estar disponibles al reabrir.
  let restoredApplicationIds: string[] = [];
  let pendingApplicationIds: string[] = [];
  {
    const { data: current } = await admin
      .from("bookings")
      .select("match_id, payment_status")
      .eq("id", input.bookingId)
      .maybeSingle();
    // Una reserva sin cobro (beta) conserva el strike y el estado del partido, pero no mueve dinero.
    if (current?.payment_status === "none") input = { ...input, plan: withoutMoney(input.plan) };
    if (current) {
      const { data: apps } = await admin
        .from("applications")
        .select("id, status")
        .eq("match_id", current.match_id)
        .in("status", ["rejected", "pending"]);
      if (input.plan.matchAfter === "open") {
        restoredApplicationIds = (apps ?? []).filter((a) => a.status === "rejected").map((a) => a.id);
      } else {
        // Si queda otro portero el partido no se reabre: las candidaturas descartadas (y las pendientes que cierre la base de datos) ya no vuelven.
        pendingApplicationIds = (apps ?? []).map((a) => a.id);
      }
    }
  }
  const { data: ok, error } = await admin.rpc("cancel_booking", {
    p_booking_id: input.bookingId,
    p_by: input.by,
    p_charge_pct: input.plan.chargePct,
    p_keeper_share_pence: input.plan.keeperSharePence,
    p_strike_kind: input.plan.strikeKind,
    p_reopen: input.plan.matchAfter === "open",
    p_reason: input.reason,
    p_actor: input.actorId,
  });
  if (error) throw error;
  if (!ok) return { cancelled: false, moneyPending: false };

  defer(() =>
    notifyBookingCancelled(input.bookingId, {
      by: input.by,
      refundPence: input.plan.refundPence,
      keeperSharePence: input.plan.keeperSharePence,
      strikeKind: input.plan.strikeKind,
      reopened: input.plan.matchAfter === "open",
      restoredApplicationIds,
      pendingApplicationIds,
    }),
  );
  try {
    await processCancellationMoney(input.bookingId);
    return { cancelled: true, moneyPending: false };
  } catch (e) {
    console.error(`cancellation money pending for booking ${input.bookingId}`, e);
    defer(() => notifyAdminPaymentProblem(input.bookingId, "cancellation", e));
    return { cancelled: true, moneyPending: true };
  }
}

/** Reembolsa al equipo y paga al portero lo que corresponda. Idempotente y reanudable. */
export async function processCancellationMoney(bookingId: string) {
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: b } = await admin
    .from("bookings")
    .select(
      "id, status, payment_status, rate_pence, commission_pct, cancellation_charge_pct, goalkeeper_id, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, released_at",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!b || b.status !== "cancelled" || b.cancellation_charge_pct === null) return;
  if (b.payment_status === "none") return;

  const work = cancellationWork({
    ratePence: b.rate_pence,
    commissionPct: Number(b.commission_pct),
    chargePct: b.cancellation_charge_pct,
    paymentStatus: b.payment_status,
    transferId: b.stripe_transfer_id,
    releasedAt: b.released_at,
  });

  if (work.refundPending) {
    if (!b.stripe_payment_intent_id) throw new Error("Booking has no payment to refund");
    // Las claves de idempotencia caducan a las 24 h: si ya hay un reembolso se reutiliza.
    const existing = await stripe.refunds.list({ payment_intent: b.stripe_payment_intent_id, limit: 1 });
    const refund =
      existing.data[0] ??
      (await stripe.refunds.create(
        { payment_intent: b.stripe_payment_intent_id, amount: work.refundPence, metadata: { booking_id: bookingId } },
        { idempotencyKey: `refund:${bookingId}:cancel` },
      ));
    await admin
      .from("bookings")
      .update({
        payment_status: b.cancellation_charge_pct === 0 ? "refunded" : "partially_refunded",
        stripe_refund_id: refund.id,
      })
      .eq("id", bookingId);
    await admin
      .from("booking_events")
      .insert({ booking_id: bookingId, type: "refunded", data: { refund: refund.id, amount: work.refundPence } });
  }

  if (work.payoutPending) {
    if (!b.stripe_charge_id) throw new Error("Booking has no charge to pay from");
    const { transfer, deductedPence } = await transferToKeeper({
      bookingId,
      goalkeeperId: b.goalkeeper_id,
      chargeId: b.stripe_charge_id,
      amountPence: work.payoutPence,
    });
    await admin
      .from("bookings")
      .update({
        stripe_transfer_id: transfer?.id ?? null,
        released_at: new Date().toISOString(),
        // Con cobro del 100% queda todo pagado al portero; con el 50% el estado final es "parcialmente reembolsado".
        ...(b.cancellation_charge_pct === 100 ? { payment_status: "released" } : {}),
      })
      .eq("id", bookingId);
    await admin.from("booking_events").insert({
      booking_id: bookingId,
      type: "released",
      data: { transfer: transfer?.id ?? null, amount: work.payoutPence - deductedPence, debt_deducted: deductedPence },
    });
  }
}
