import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/platform/button";
import { confirmCheckoutSession } from "@/lib/payments/checkout";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Booking", robots: { index: false } };

// Stripe vuelve aquí tras pagar. El webhook es la vía principal; esta página confirma igualmente (idempotente).
export default async function BookedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!sessionId) redirect("/matches");

  let result: { paid: boolean; matchId: string } | null = null;
  try {
    result = await confirmCheckoutSession(sessionId, user.id);
  } catch (e) {
    console.error("BookedPage confirm failed", e);
  }

  return (
    <>
      <PageHeader eyebrow="Booking" title={result?.paid ? "Keeper booked" : "Payment not completed"} />
      <section className="pl-surface grid gap-4 rounded-[var(--r-xl)] p-5 sm:p-6">
        {result?.paid ? (
          <>
            <StatusBadge tone="success">Payment received</StatusBadge>
            <p className="pl-prose text-[15px]">
              Your keeper is booked. The keeper transfer is pending until the match rules are met.
            </p>
          </>
        ) : (
          <>
            <StatusBadge tone="warning">{result ? "Not paid" : "Could not check"}</StatusBadge>
            <p className="pl-prose text-[15px]">
              {result
                ? "No payment was taken. You can go back to the match and try again."
                : "We couldn't confirm the payment right now. If you were charged, it will show up on the match shortly."}
            </p>
          </>
        )}
        <div>
          <Button href={result ? `/matches/${result.matchId}` : "/matches"} withArrow>
            {result ? "Go to the match" : "My matches"}
          </Button>
        </div>
      </section>
    </>
  );
}
