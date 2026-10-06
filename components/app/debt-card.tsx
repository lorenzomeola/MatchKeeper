import { StatusBadge } from "@/components/app/status-badge";
import { moneyPence } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/site";

/** Aviso al portero de lo que debe por una disputa y de que se descuenta de sus próximos pagos. */
export function DebtCard({ pence }: { pence: number }) {
  if (pence <= 0) return null;
  return (
    <section className="rounded-[var(--r-lg)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-5">
      <StatusBadge tone="warning">Amount owed</StatusBadge>
      <p className="mt-3 text-[15px] font-semibold text-fg">{moneyPence(pence)} to repay after a disputed payment</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        A team disputed a payment with its bank because the match did not go as booked. We take this amount from your next
        payouts until it is repaid. If the dispute is won, you get it back.
      </p>
      <p className="mt-2 text-sm text-muted">
        Think it is a mistake?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-strong underline underline-offset-4">
          Write to us
        </a>
        .
      </p>
    </section>
  );
}
