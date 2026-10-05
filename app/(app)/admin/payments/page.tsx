import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { WalletIcon } from "@/components/platform/icons";
import { loadPayments } from "@/lib/data/admin";
import { dateTile, money } from "@/lib/format";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function AdminPaymentsPage() {
  const { rows, names } = await loadPayments();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        description="Payments are not connected yet. Bookings are recorded with the rate and the fee, but nobody is charged."
      />

      <section className="mb-8 rounded-[var(--r-lg)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-5">
        <StatusBadge tone="warning">Stripe not connected</StatusBadge>
        <p className="mt-3 text-[15px] font-semibold text-fg">What this page will show</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Payments held, released and refunded, plus disputes and keeper payouts. Until Stripe is set up, the list below only shows what a
          booking would cost.
        </p>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No bookings yet" body="Bookings appear here as soon as a team books a keeper." />
      ) : (
        <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
          {rows.map((b) => {
            const rate = Number(b.rate);
            const fee = (rate * Number(b.commission_pct)) / 100;
            const t = b.matches ? dateTile(b.matches.starts_at) : null;
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-fg">{b.matches?.address ?? "Match"}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {t ? `${t.day} ${t.month} · ` : ""}
                    {names.get(b.player_id)?.name ?? "Player"} to {names.get(b.goalkeeper_id)?.name ?? "keeper"}
                  </span>
                </span>
                <span className="pl-tnum text-right text-sm">
                  <span className="block font-semibold text-fg">{money(rate)}</span>
                  <span className="block text-xs text-muted">fee {money(fee)} · not charged</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
