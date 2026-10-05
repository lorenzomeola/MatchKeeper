import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { EmptyState } from "@/components/app/empty-state";
import { joined } from "@/components/app/admin-parts";
import { PageHeader, Section, SectionLink } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { MATCH_STATUS, StatusBadge } from "@/components/app/status-badge";
import { ShieldCheckIcon } from "@/components/platform/icons";
import { loadAdminOverview, profileRating } from "@/lib/data/admin";
import { dateTile } from "@/lib/format";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminOverviewPage() {
  const { counts: c, pending, reports, matches, names } = await loadAdminOverview();

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="What needs a decision today, and how the platform is doing." />

      <div className="grid gap-6">
        {(c.pendingKeepers > 0 || c.openReports > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {c.pendingKeepers > 0 && (
              <Link
                href="/admin/goalkeepers"
                className="pl-lift group flex items-center gap-3.5 rounded-[var(--r-lg)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-4"
              >
                <span className="pl-display pl-tnum text-warning [font-size:var(--t-3xl)]">{c.pendingKeepers}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-fg">
                    {c.pendingKeepers === 1 ? "Keeper" : "Keepers"} waiting for approval
                  </span>
                  <span className="block text-[13px] text-muted">They can&apos;t apply to matches until you review them.</span>
                </span>
              </Link>
            )}
            {c.openReports > 0 && (
              <Link
                href="/admin/reports"
                className="pl-lift group flex items-center gap-3.5 rounded-[var(--r-lg)] border border-danger/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-4"
              >
                <span className="pl-display pl-tnum text-danger [font-size:var(--t-3xl)]">{c.openReports}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-fg">Open {c.openReports === 1 ? "report" : "reports"}</span>
                  <span className="block text-[13px] text-muted">Reported from a conversation.</span>
                </span>
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Users" value={c.users} hint={`${c.newUsers} new this week`} href="/admin/users" />
          <StatCard label="Keepers" value={c.keepers} hint={`${c.keepers - c.pendingKeepers} approved`} href="/admin/goalkeepers" />
          <StatCard label="Open matches" value={c.openMatches} hint={`${c.bookedMatches} with a keeper booked`} href="/admin/matches" />
          <StatCard label="Applications" value={c.applications} hint={`${c.bookings} bookings in total`} />
        </div>
      </div>

      <Section title="Keepers to review" action={<SectionLink href="/admin/goalkeepers">All keepers</SectionLink>} className="mt-10">
        {pending.length === 0 ? (
          <EmptyState icon={ShieldCheckIcon} title="Nobody waiting" body="Every keeper who signed up has been reviewed." />
        ) : (
          <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
            {pending.map((p) => {
              const r = profileRating(p);
              return (
                <li key={p.id}>
                  <Link href="/admin/goalkeepers" className="flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3 transition-colors duration-200 hover:bg-surface">
                    <Avatar name={p.display_name} src={p.avatar_url} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-fg">{p.display_name}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {p.city ?? "No city"} · joined {joined(p.created_at)} · profile {r.percent}%
                      </span>
                    </span>
                    {r.requiredMissing.length > 0 ? (
                      <StatusBadge tone="warning">Incomplete</StatusBadge>
                    ) : (
                      <StatusBadge tone="accent">Ready to review</StatusBadge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {reports.length > 0 && (
        <Section title="Open reports" action={<SectionLink href="/admin/reports">All reports</SectionLink>}>
          <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/reports/${r.id}`} className="block px-4 py-3.5 transition-colors duration-200 hover:bg-surface">
                  <p className="text-[15px] font-medium text-fg">{r.reason}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {names.get(r.reporter_id)?.name ?? "Someone"} reported {names.get(r.reported_id)?.name ?? "a user"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Latest matches" action={<SectionLink href="/admin/matches">All matches</SectionLink>}>
        {matches.length === 0 ? (
          <p className="pl-prose text-[15px]">No matches posted yet.</p>
        ) : (
          <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
            {matches.map((m) => {
              const t = dateTile(m.starts_at);
              const s = MATCH_STATUS[m.status] ?? MATCH_STATUS.open;
              return (
                <li key={m.id}>
                  <Link href={`/matches/${m.id}`} className="flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors duration-200 hover:bg-surface">
                    <span className="w-12 shrink-0 text-center leading-none">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t.weekday}</span>
                      <span className="pl-display pl-tnum mt-1 block text-lg text-fg">{t.day}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-fg">{m.address ?? "Pitch to be confirmed"}</span>
                      <span className="block truncate text-[13px] text-muted">by {names.get(m.created_by)?.name ?? "a player"}</span>
                    </span>
                    <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
