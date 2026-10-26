import type { Metadata } from "next";
import { AdminCheckIn } from "@/components/app/admin-checkin";
import { ReviewActions } from "@/components/app/admin-review-actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { WalletIcon } from "@/components/platform/icons";
import { loadPayments } from "@/lib/data/admin";
import { dateTile, money, moneyPence } from "@/lib/format";
import { getPaymentMode } from "@/lib/payments/mode";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: "success" | "accent" | "warning" | "neutral" | "danger" }> = {
  confirmed: { label: "Transfer pending", tone: "accent" },
  completed: { label: "Paid out", tone: "success" },
  under_review: { label: "Needs review", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const FREE_STATUS: typeof STATUS = {
  confirmed: { label: "Booked", tone: "accent" },
  completed: { label: "Played", tone: "success" },
  under_review: { label: "Needs review", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const RESPONSE: Record<string, string> = {
  confirmed: "Team confirmed the match",
  reported_no_show: "Team reports the keeper did not show up",
  reported_other: "Team reports another problem",
};

export default async function AdminPaymentsPage() {
  const [{ rows, names, photoUrls }, mode] = await Promise.all([loadPayments(), getPaymentMode()]);
  const paid = mode === "paid";
  const review = rows.filter((b) => b.status === "under_review");
  const checkIn = (b: (typeof rows)[number]) => (
    <AdminCheckIn
      status={b.status}
      startsAt={b.matches?.starts_at ?? b.created_at}
      checkedInAt={b.keeper_checked_in_at}
      distanceM={b.check_in_distance_m}
      lat={b.check_in_lat}
      lng={b.check_in_lng}
      photoUrl={b.check_in_photo_path ? (photoUrls.get(b.check_in_photo_path) ?? null) : null}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={paid ? "Payments" : "Bookings"}
        description={
          paid
            ? "Bookings paid through Stripe. Keeper transfers pending or paused for review appear here."
            : "Every booking with its keeper check-in. Bookings that need a decision appear first."
        }
      />

      {review.length > 0 && (
        <section className="mb-8">
          <h2 className="pl-display mb-3 text-fg [font-size:var(--t-xl)]">Needs review ({review.length})</h2>
          <ul className="grid gap-3">
            {review.map((b) => {
              const t = b.matches ? dateTile(b.matches.starts_at) : null;
              return (
                <li key={b.id} className="rounded-[var(--r-lg)] border border-warning/40 p-4">
                  <p className="text-[15px] font-medium text-fg">{b.matches?.address ?? "Match"}</p>
                  <p className="text-[13px] text-muted">
                    {t ? `${t.day} ${t.month} · ` : ""}
                    {names.get(b.player_id)?.name ?? "Player"} booked {names.get(b.goalkeeper_id)?.name ?? "keeper"} ·{" "}
                    {paid ? (b.total_pence ? moneyPence(b.total_pence) : "amount unknown") : `${money(b.rate)} asked by the keeper`}
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-fg-2">
                    <li>{checkIn(b)}</li>
                    <li>{b.team_response ? RESPONSE[b.team_response] : "Team did not answer"}</li>
                    {b.team_report_note && <li>Note: {b.team_report_note}</li>}
                  </ul>
                  <ReviewActions bookingId={b.id} free={b.payment_status === "none"} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="No bookings yet"
          body={paid ? "Bookings appear here as soon as a team pays for a keeper." : "Bookings appear here as soon as a team picks a keeper."}
        />
      ) : (
        <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
          {rows.map((b) => {
            const t = b.matches ? dateTile(b.matches.starts_at) : null;
            const base = STATUS[b.status] ?? { label: b.status, tone: "neutral" as const };
            const s = paid ? base : (FREE_STATUS[b.status] ?? base);
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-fg">{b.matches?.address ?? "Match"}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {t ? `${t.day} ${t.month} · ` : ""}
                    {names.get(b.player_id)?.name ?? "Player"} to {names.get(b.goalkeeper_id)?.name ?? "keeper"}
                  </span>
                </span>
                <span className="pl-tnum flex items-center gap-3 text-right text-sm">
                  <span className="font-semibold text-fg">{paid ? (b.total_pence ? moneyPence(b.total_pence) : "-") : money(b.rate)}</span>
                  <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  {paid && <span className="text-xs text-muted">{b.payment_status.replace("_", " ")}</span>}
                </span>
                {b.matches && b.status !== "cancelled" && <div className="basis-full pt-1">{checkIn(b)}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
