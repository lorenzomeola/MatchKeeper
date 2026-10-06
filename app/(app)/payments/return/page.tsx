import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PaymentSetupCard } from "@/components/app/payment-setup-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/platform/button";
import { syncKeeperAccount } from "@/lib/payments/connect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

// Stripe redirige aquí al salir del alta, pero eso no significa que esté completa: se consulta el estado real.
export default async function PaymentsReturnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let state: Awaited<ReturnType<typeof syncKeeperAccount>> = null;
  let failed = false;
  try {
    state = await syncKeeperAccount(user.id);
  } catch (e) {
    console.error("PaymentsReturnPage sync failed", e);
    failed = true;
  }

  const ready = state?.payoutsEnabled ?? false;
  // Alta enviada pero Stripe aún activando las capacidades: basta con volver a consultar.
  const confirming = !ready && !failed && state?.onboardingComplete === true;

  return (
    <>
      <PageHeader
        eyebrow="Payments"
        title={ready ? "You are all set" : confirming ? "Confirming your details" : "Almost there"}
      />
      {ready ? (
        <section className="pl-surface grid gap-4 rounded-[var(--r-xl)] p-5 sm:p-6">
          <StatusBadge tone="success">Payments ready</StatusBadge>
          <p className="pl-prose text-[15px]">You can now apply to open matches and get paid through MatchKeeper.</p>
          <div>
            <Button href="/map" withArrow>
              Find matches
            </Button>
          </div>
        </section>
      ) : confirming || failed ? (
        <section className="pl-surface grid gap-4 rounded-[var(--r-xl)] p-5 sm:p-6">
          <StatusBadge tone="warning">{failed ? "Could not check" : "Stripe is confirming"}</StatusBadge>
          <p className="pl-prose text-[15px]">
            {failed
              ? "We couldn't check your payment status right now. Try again in a moment."
              : "Your details were sent. Stripe usually confirms them within a few seconds."}
          </p>
          <div>
            <Button href="/payments/return" variant="secondary">
              Check again
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4">
          <p className="pl-prose text-[15px]">Stripe still needs some information from you before you can get paid.</p>
          <PaymentSetupCard resume={state !== null} />
        </div>
      )}
    </>
  );
}
