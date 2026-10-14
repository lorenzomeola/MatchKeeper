import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeeperPayments, TeamPayments } from "@/components/app/payment-history";
import { PageHeader } from "@/components/app/page-header";
import { PayoutProblemCard } from "@/components/app/payout-problem-card";
import { loadKeeperPayments, loadPayoutProblem, loadTeamPayments } from "@/lib/data/payments";
import { getOrCreateProfile } from "@/lib/profile-ensure";
import { getPaymentMode } from "@/lib/payments/mode";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if ((await getPaymentMode()) !== "paid") redirect("/dashboard");

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) redirect("/signup");

  if (profile.role === "goalkeeper") {
    const { entries, teamOf, summary } = await loadKeeperPayments(supabase, user.id);
    const { data: stripeAccount } = await supabase
      .from("keeper_stripe_accounts")
      .select("payouts_enabled")
      .eq("profile_id", user.id)
      .maybeSingle();
    const payoutProblem = await loadPayoutProblem(supabase, user.id);
    return (
      <>
        <PageHeader
          eyebrow="Goalkeeper"
          title="Payments"
          description="What you have earned, game by game, and what is still on its way."
        />
        {payoutProblem && (
          <div className="mb-6">
            <PayoutProblemCard message={payoutProblem.message} />
          </div>
        )}
        <KeeperPayments entries={entries} teamOf={teamOf} summary={summary} hasStripeAccount={Boolean(stripeAccount?.payouts_enabled) && !payoutProblem} />
      </>
    );
  }

  const { entries, keeperOf, summary } = await loadTeamPayments(supabase, user.id);
  return (
    <>
      <PageHeader
        eyebrow="Payments"
        title="Your payments"
        description="Every booking with what you paid, the service fee and any refund."
      />
      <TeamPayments entries={entries} keeperOf={keeperOf} summary={summary} />
    </>
  );
}
