import "server-only";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "./app-url";
import { deriveKeeperPaymentState } from "./connect-status";

async function ensureKeeperAccount(profileId: string, email: string | undefined, displayName: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("keeper_stripe_accounts")
    .select("stripe_account_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing) return existing.stripe_account_id as string;

  // Configuración permanente de la cuenta: ver PAYMENTS_SPEC.md §3 antes de tocarla.
  const account = await getStripe().v2.core.accounts.create(
    {
      display_name: displayName,
      contact_email: email,
      dashboard: "express",
      defaults: {
        currency: "gbp",
        // Evita que el alta pida una web a porteros que no tienen.
        profile: {
          product_description:
            "Freelance goalkeeper for amateur football matches in London, paid per match through MatchKeeper.",
        },
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      identity: { country: "GB", entity_type: "individual" },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      metadata: { profile_id: profileId },
    },
    { idempotencyKey: `keeper-account:${profileId}` },
  );

  const { error } = await admin
    .from("keeper_stripe_accounts")
    .insert({ profile_id: profileId, stripe_account_id: account.id });
  // 23505: otra petición ya guardó la misma cuenta (la clave de idempotencia devuelve la misma).
  if (error && error.code !== "23505") throw error;
  return account.id;
}

/** URL de un solo uso del alta alojada por Stripe. Crea la cuenta conectada si aún no existe. */
export async function startKeeperOnboarding(user: { id: string; email?: string }, displayName: string) {
  const accountId = await ensureKeeperAccount(user.id, user.email, displayName);
  const link = await getStripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${appUrl()}/payments/refresh`,
        return_url: `${appUrl()}/payments/return`,
      },
    },
  });
  return link.url;
}

/** Lee el estado en Stripe y lo guarda. Devuelve null si el portero aún no tiene cuenta. */
export async function syncKeeperAccount(profileId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("keeper_stripe_accounts")
    .select("stripe_account_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;

  const account = await getStripe().v2.core.accounts.retrieve(data.stripe_account_id, {
    include: ["configuration.recipient", "requirements"],
  });
  const caps = account.configuration?.recipient?.capabilities?.stripe_balance;
  const state = deriveKeeperPaymentState({
    transfersStatus: caps?.stripe_transfers?.status,
    payoutsStatus: caps?.payouts?.status,
    outstandingRequirements: account.requirements?.entries?.length,
  });

  await admin
    .from("keeper_stripe_accounts")
    .update({
      payouts_enabled: state.payoutsEnabled,
      onboarding_complete: state.onboardingComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);
  return state;
}
