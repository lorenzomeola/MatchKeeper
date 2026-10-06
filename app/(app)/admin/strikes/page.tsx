import Link from "next/link";
import type { Metadata } from "next";
import { WaiveStrikeButton } from "@/components/app/admin-strike-actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { BlockIcon } from "@/components/platform/icons";
import { loadStrikes } from "@/lib/data/admin";
import { longDate, shortDate } from "@/lib/format";
import { REVIEW_POINTS, SUSPENSION_POINTS } from "@/lib/strikes";

export const metadata: Metadata = { title: "Strikes", robots: { index: false } };

const LEVEL = {
  suspended: { label: "Suspended", tone: "danger" },
  review: { label: "Needs review", tone: "warning" },
  warned: { label: "Warned", tone: "neutral" },
  good: { label: "In good standing", tone: "success" },
} as const;

const KIND: Record<string, string> = { no_show: "No-show", late_cancel: "Late cancellation" };

const REASON: Record<string, string> = {
  keeper_no_show: "Never checked in and the team reported a no-show",
  keeper_cancelled: "Cancelled less than 24 hours before kick-off",
  admin_refund_strike: "Admin refunded the team and added a strike after a review",
};

export default async function AdminStrikesPage() {
  const groups = await loadStrikes();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Strikes"
        description={`A no-show is 3 points for 12 months. A late cancellation is 1 point for 90 days. From ${REVIEW_POINTS} points a keeper needs review, and from ${SUSPENSION_POINTS} they can't apply to new matches.`}
      />

      {groups.length === 0 ? (
        <EmptyState icon={BlockIcon} title="No strikes yet" body="Strikes appear here when a keeper cancels late or does not show up." />
      ) : (
        <ul className="grid gap-4">
          {groups.map((g) => {
            const level = LEVEL[g.standing.level];
            return (
              <li key={g.keeperId} className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/users/${g.keeperId}`} className="text-base font-semibold text-fg hover:text-accent-strong">
                    {g.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="pl-tnum text-sm text-muted">
                      {g.standing.points} {g.standing.points === 1 ? "point" : "points"}
                    </span>
                    <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
                  </span>
                </div>

                {g.standing.removalCandidate && (
                  <p className="mt-3 rounded-[var(--r-md)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-sm font-medium text-danger">
                    {g.standing.noShows} no-shows in the last 12 months. Candidate for permanent removal.
                  </p>
                )}

                {g.upcoming.length > 0 && (
                  <div className="mt-3 rounded-[var(--r-md)] border border-warning/40 px-3 py-2 text-sm text-fg-2">
                    <p className="font-medium text-fg">Upcoming bookings of a suspended keeper</p>
                    <ul className="mt-1 grid gap-0.5">
                      {g.upcoming.map((b) => (
                        <li key={b.id}>
                          <Link href={`/matches/${b.matchId}`} className="underline underline-offset-4">
                            {b.address ?? "Match"} · {longDate(b.startsAt)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ul className="mt-3 divide-y divide-line">
                  {g.strikes.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                      <span className="min-w-0 text-sm">
                        <span className={`block font-medium ${s.active ? "text-fg" : "text-muted line-through"}`}>
                          {KIND[s.kind ?? "late_cancel"] ?? s.kind} · {shortDate(s.createdAt)}
                        </span>
                        <span className="block text-xs text-muted">
                          {s.waivedAt ? `Cancelled by an admin: ${s.waivedReason ?? ""}` : s.active ? (REASON[s.reason] ?? s.reason) : `${REASON[s.reason] ?? s.reason} (no longer counts)`}
                        </span>
                      </span>
                      {s.active && <WaiveStrikeButton strikeId={s.id} />}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
