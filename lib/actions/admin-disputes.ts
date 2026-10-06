"use server";

import { revalidatePath } from "next/cache";
import { generateEvidenceFor, recoverFromKeeper } from "@/lib/payments/dispute-handlers";
import { DISPUTE_FAULTS, evidenceSubmitBlock, type DisputeFault } from "@/lib/payments/disputes";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LifecycleState } from "./booking-lifecycle";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." as const };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Not authorized." as const };
  return { error: null, user };
}

async function logEvent(bookingId: string | null, type: string, actorId: string, data: Record<string, unknown>) {
  if (!bookingId) return;
  await createAdminClient().from("booking_events").insert({ booking_id: bookingId, type, actor_id: actorId, data });
}

const done = (message: string): LifecycleState => {
  revalidatePath("/admin/disputes");
  return { error: null, done: true, message };
};

/** Quién asume la disputa. Con "keeper" se intenta recuperar del portero lo que cobró por esa reserva. */
export async function setDisputeFaultAction(disputeId: string, fault: DisputeFault): Promise<LifecycleState> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };
  if (!DISPUTE_FAULTS.includes(fault)) return { error: "Choose who is at fault." };

  const admin = createAdminClient();
  const { data: d } = await admin
    .from("disputes")
    .select("id, booking_id, fault, status, reversed_pence")
    .eq("id", disputeId)
    .maybeSingle();
  if (!d) return { error: "Dispute not found." };
  if (d.fault === fault) return { error: "That is already the decision." };

  // Una vez iniciada la recuperación no se cambia la decisión: habría que deshacer una reversión o una deuda.
  const { count: debts } = await admin.from("keeper_debts").select("id", { count: "exact", head: true }).eq("dispute_id", d.id);
  if (d.fault === "keeper" && (d.reversed_pence > 0 || (debts ?? 0) > 0)) {
    return { error: "Recovery from the keeper has already started, so this decision can't change." };
  }

  await admin
    .from("disputes")
    .update({ fault, fault_set_by: auth.user.id, fault_set_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", d.id);
  await logEvent(d.booking_id, "dispute_fault_set", auth.user.id, { dispute: d.id, fault });

  if (fault !== "keeper") return done("Decision saved.");
  if (["won", "warning_closed"].includes(d.status)) return done("Decision saved. The dispute was won, so nothing is recovered.");

  try {
    const res = await recoverFromKeeper(d.id, auth.user.id);
    return done(res.message);
  } catch (e) {
    console.error("recoverFromKeeper failed", e);
    return { error: "The decision was saved but the recovery failed. Try again in a moment." };
  }
}

/** Envía a Stripe la evidencia ya preparada. Solo un admin y solo una vez: perder tras responder cuesta otras 20 libras. */
export async function submitDisputeEvidenceAction(disputeId: string): Promise<LifecycleState> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data: d } = await admin
    .from("disputes")
    .select("id, stripe_dispute_id, booking_id, status, due_by, evidence, evidence_submitted_at")
    .eq("id", disputeId)
    .maybeSingle();
  if (!d) return { error: "Dispute not found." };

  const block = evidenceSubmitBlock({
    status: d.status,
    dueBy: d.due_by ? new Date(d.due_by) : null,
    submittedAt: d.evidence_submitted_at ? new Date(d.evidence_submitted_at) : null,
    hasEvidence: Boolean(d.evidence?.stripe),
    now: new Date(),
  });
  if (block) return { error: block };

  try {
    const res = await getStripe().disputes.update(d.stripe_dispute_id, { evidence: d.evidence.stripe, submit: true });
    await admin
      .from("disputes")
      .update({ evidence_submitted_at: new Date().toISOString(), status: res.status, updated_at: new Date().toISOString() })
      .eq("id", d.id);
    await logEvent(d.booking_id, "dispute_evidence_submitted", auth.user.id, { dispute: d.stripe_dispute_id });
  } catch (e) {
    console.error("submitDisputeEvidenceAction failed", e);
    return { error: "Stripe did not accept the evidence. Try again or send it from the Stripe Dashboard." };
  }
  return done("Evidence sent to Stripe.");
}

/** No responder: se acepta la disputa y el banco se queda con el dinero. */
export async function acceptDisputeAction(disputeId: string): Promise<LifecycleState> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data: d } = await admin.from("disputes").select("id, stripe_dispute_id, booking_id, status").eq("id", disputeId).maybeSingle();
  if (!d) return { error: "Dispute not found." };
  if (!["needs_response", "warning_needs_response"].includes(d.status)) return { error: "This dispute is no longer waiting for a response." };

  try {
    const res = await getStripe().disputes.close(d.stripe_dispute_id);
    await admin.from("disputes").update({ status: res.status, updated_at: new Date().toISOString() }).eq("id", d.id);
    await logEvent(d.booking_id, "dispute_accepted", auth.user.id, { dispute: d.stripe_dispute_id });
  } catch (e) {
    console.error("acceptDisputeAction failed", e);
    return { error: "Stripe could not close the dispute. Try again in a moment." };
  }
  return done("Dispute accepted.");
}

export async function regenerateEvidenceAction(disputeId: string): Promise<LifecycleState> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { data: d } = await createAdminClient()
    .from("disputes")
    .select("id, booking_id, evidence_submitted_at")
    .eq("id", disputeId)
    .maybeSingle();
  if (!d?.booking_id) return { error: "This dispute is not linked to a booking." };
  if (d.evidence_submitted_at) return { error: "The evidence was already sent." };

  try {
    await generateEvidenceFor(d.id, d.booking_id);
  } catch (e) {
    console.error("regenerateEvidenceAction failed", e);
    return { error: "We couldn't prepare the evidence. Try again in a moment." };
  }
  return done("Evidence prepared again.");
}

/** Perdona una deuda de un portero (error, acuerdo con él). Lo ya descontado de sus pagos no se devuelve. */
export async function waiveDebtAction(debtId: string, reason: string): Promise<LifecycleState> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };
  const text = reason.trim();
  if (text.length < 3) return { error: "Write a short reason." };

  const { data } = await createAdminClient()
    .from("keeper_debts")
    .update({ status: "waived", settled_at: new Date().toISOString(), reason: `Waived by an admin: ${text.slice(0, 300)}` })
    .eq("id", debtId)
    .eq("status", "open")
    .select("id");
  if (!data?.length) return { error: "This debt is not open." };
  return done("Debt cancelled.");
}
