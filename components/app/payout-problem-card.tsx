import { StatusBadge } from "@/components/app/status-badge";
import { StripeDashboardButton } from "@/components/app/stripe-dashboard-button";

/** Aviso al portero de que Stripe no pudo pagar a su banco, con acceso directo a su panel para corregirlo. */
export function PayoutProblemCard({ message }: { message: string | null }) {
  return (
    <section className="rounded-[var(--r-lg)] border border-danger/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-5">
      <StatusBadge tone="danger">Payout failed</StatusBadge>
      <p className="mt-3 text-[15px] font-semibold text-fg">Stripe could not pay out to your bank</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Your money is safe in your Stripe balance. Until your bank details are fixed, Stripe cannot send it to you.
        {message ? ` Stripe says: ${message}` : ""}
      </p>
      <div className="mt-4">
        <StripeDashboardButton />
      </div>
    </section>
  );
}
