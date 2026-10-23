import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { classifyFailure, MAX_ATTEMPTS, retryDelayMs } from "./rules.ts";

type Provider = Pick<Resend["emails"], "cancel" | "get">;
type Summary = { cancelled: number; cancellationRetry: number; cancellationFailed: number; sent: number; skipped: number };
const STALE_CLAIM_MS = 10 * 60_000;
const SENT_EVENTS = new Set(["sent", "delivered", "delivery_delayed", "bounced", "complained", "opened", "clicked"]);

export async function finishCancelledSend(
  admin: SupabaseClient,
  provider: () => Provider,
  id: string,
  providerId: string | null = null,
  failure?: string,
) {
  const status = providerId ? "cancel_pending" : failure ? "cancel_failed" : "cancelled";
  const { data, error } = await admin.from("email_outbox").update({
    status, provider_id: providerId, attempts: 0, claimed_at: null,
    send_after: new Date().toISOString(), last_error: failure?.slice(0, 500) ?? null,
  }).eq("id", id).eq("status", "cancel_after_send").select("id").maybeSingle();
  if (error) throw error;
  if (!data) return;
  if (failure) console.error("email cancellation needs manual reconciliation", { id, error: failure });
  if (providerId) await retryEmailCancellations(admin, provider);
}

async function attemptCancellation(admin: SupabaseClient, provider: () => Provider, id: string, now: Date) {
  const { data: row, error } = await admin.from("email_outbox")
    .update({ status: "cancelling", claimed_at: now.toISOString() })
    .eq("id", id).eq("status", "cancel_pending").lte("send_after", now.toISOString())
    .select("id, provider_id, attempts").maybeSingle();
  if (error) throw error;
  if (!row) return "skipped";

  const attempts = row.attempts + 1;
  let outcome: "cancelled" | "sent" | "cancel_pending" | "cancel_failed" = "cancel_pending";
  let message: string | null = null;
  let permanent = false;
  try {
    if (!row.provider_id) {
      permanent = true;
      throw new Error("Cannot cancel scheduled email without a provider id");
    }
    const result = await provider().cancel(row.provider_id);
    if (!result.error && result.data?.id === row.provider_id) {
      outcome = "cancelled";
    } else if (result.error && classifyFailure(result.error) === "retry") {
      message = `${result.error.name}: ${result.error.message}`;
    } else {
      // A rejection is not proof of delivery: inspect the provider before choosing a terminal state.
      const current = await provider().get(row.provider_id);
      if (current.error) {
        message = `${result.error?.name ?? "invalid_cancel_response"}: ${result.error?.message ?? "Cancellation not confirmed"}; lookup ${current.error.name}: ${current.error.message}`;
        permanent = classifyFailure(current.error) === "permanent";
      } else if (current.data?.id !== row.provider_id) {
        message = "Provider lookup did not return the requested email";
      } else if (current.data.last_event === "canceled") {
        outcome = "cancelled";
      } else if (current.data && SENT_EVENTS.has(current.data.last_event)) {
        outcome = "sent";
      } else {
        message = `${result.error?.name ?? "invalid_cancel_response"}: ${result.error?.message ?? "Cancellation not confirmed"}; provider state: ${current.data?.last_event ?? "unknown"}`;
        permanent = result.error ? classifyFailure(result.error) === "permanent" && !["scheduled", "queued"].includes(current.data?.last_event ?? "") : false;
      }
    }
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    if (message.includes("RESEND_API_KEY")) permanent = true;
  }

  if (outcome === "cancel_pending") {
    if (permanent || attempts >= MAX_ATTEMPTS) outcome = "cancel_failed";
    console.error(`email cancellation ${outcome === "cancel_failed" ? "failed" : "will retry"}`, {
      id, providerId: row.provider_id, attempts, error: message,
    });
  }
  const { error: updateError } = await admin.from("email_outbox").update({
    status: outcome,
    attempts,
    claimed_at: null,
    last_error: message?.slice(0, 500) ?? null,
    ...(outcome === "cancel_pending" ? { send_after: new Date(now.getTime() + retryDelayMs(attempts)).toISOString() } : {}),
  }).eq("id", id).eq("status", "cancelling");
  if (updateError) throw updateError;
  return outcome === "cancel_pending" ? "cancellationRetry" : outcome === "cancel_failed" ? "cancellationFailed" : outcome;
}

/** Persists cancellation intent before calling Resend; never returns a failed cancellation to the send queue. */
export async function requestEmailCancellations(admin: SupabaseClient, provider: () => Provider, keyPrefix: string) {
  const now = new Date().toISOString();
  let cancelled = 0;
  // This order also catches a sender claiming pending work or finishing while cancellation is requested.
  for (const [status, update] of [
    ["pending", { status: "cancelled", claimed_at: null }],
    ["sending", { status: "cancel_after_send" }],
    ["scheduled", { status: "cancel_pending", attempts: 0, send_after: now, claimed_at: null }],
  ] as const) {
    const { data, error } = await admin.from("email_outbox").update(update)
      .like("dedupe_key", `${keyPrefix}%`).eq("status", status).select("id");
    if (error) throw error;
    if (status === "pending") cancelled += data?.length ?? 0;
  }
  const summary = await retryEmailCancellations(admin, provider, 50, keyPrefix);
  return cancelled + summary.cancelled;
}

export async function retryEmailCancellations(
  admin: SupabaseClient,
  provider: () => Provider,
  limit = 50,
  keyPrefix?: string,
): Promise<Summary> {
  const now = new Date();
  const stale = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
  const summary: Summary = { cancelled: 0, cancellationRetry: 0, cancellationFailed: 0, sent: 0, skipped: 0 };

  const { error: reclaimError } = await admin.from("email_outbox")
    .update({ status: "cancel_pending", claimed_at: null })
    .eq("status", "cancelling").lt("claimed_at", stale);
  if (reclaimError) throw reclaimError;

  // If a send process died before saving the provider id, cancellation cannot be proved or safely replayed.
  const { data: orphaned, error: orphanError } = await admin.from("email_outbox")
    .update({ status: "cancel_failed", claimed_at: null, last_error: "Sender stopped before cancellation could obtain the provider id; manual reconciliation required" })
    .eq("status", "cancel_after_send").lt("claimed_at", stale).select("id");
  if (orphanError) throw orphanError;
  for (const row of orphaned ?? []) {
    console.error("email cancellation needs manual reconciliation", { id: row.id });
    summary.cancellationFailed++;
  }

  let query = admin.from("email_outbox").select("id")
    .eq("status", "cancel_pending").lte("send_after", now.toISOString())
    .order("send_after", { ascending: true }).limit(limit);
  if (keyPrefix !== undefined) query = query.like("dedupe_key", `${keyPrefix}%`);
  const { data: rows, error } = await query;
  if (error) throw error;
  for (const [index, row] of (rows ?? []).entries()) {
    // Resend's default API rate limit is shared by sends, lookups and cancellations.
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    summary[await attemptCancellation(admin, provider, row.id, new Date())]++;
  }
  return summary;
}
