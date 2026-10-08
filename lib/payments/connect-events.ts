import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncKeeperAccount } from "./connect";
import { nextPayoutProblem, type PayoutProblem } from "./external-events";
import { defer, notifyPayoutFailed } from "@/lib/email/booking-emails";

/**
 * Eventos de las cuentas conectadas de los porteros. `account.updated` solo avisa de que algo cambió: se vuelve a
 * leer la cuenta en Stripe (Accounts v2) en vez de fiarse del contenido del evento.
 */
export async function handleConnectEvent(event: Stripe.Event) {
  if (!event.account) return;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("keeper_stripe_accounts")
    .select("profile_id")
    .eq("stripe_account_id", event.account)
    .maybeSingle();
  // Una cuenta conectada que no es de un portero de MatchKeeper no es asunto nuestro.
  if (!row) return;

  switch (event.type) {
    case "account.updated":
      await syncKeeperAccount(row.profile_id);
      return;
    case "payout.failed":
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;
      const { data: account, error } = await admin
        .from("keeper_stripe_accounts")
        .select("payout_failed_at, payout_failure")
        .eq("profile_id", row.profile_id)
        .maybeSingle();
      if (error) throw error;
      const current: PayoutProblem = account?.payout_failed_at
        ? { failedAt: new Date(account.payout_failed_at), message: account.payout_failure }
        : null;
      const next = nextPayoutProblem(current, {
        type: event.type,
        at: new Date(event.created * 1000),
        message: payout.failure_message ?? payout.failure_code,
      });
      if (next === current) return;
      const { error: updateError } = await admin
        .from("keeper_stripe_accounts")
        .update({ payout_failed_at: next?.failedAt.toISOString() ?? null, payout_failure: next?.message ?? null })
        .eq("profile_id", row.profile_id);
      if (updateError) throw updateError;
      if (event.type === "payout.failed" && next) {
        const reason = next.message;
        const at = next.failedAt;
        defer(() => notifyPayoutFailed(row.profile_id, reason, at));
      }
      return;
    }
    default:
      return;
  }
}
