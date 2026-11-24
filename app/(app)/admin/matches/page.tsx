import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { MatchCard } from "@/components/app/match-card";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Tabs } from "@/components/app/tabs";
import { ListIcon } from "@/components/platform/icons";
import { loadAdminMatches } from "@/lib/data/admin";
import { relativeDay } from "@/lib/format";
import { ADMIN_MATCH_TABS, adminMatchStatus, groupByMonth, type AdminMatchTab } from "@/lib/match-list-status";
import { keeperNames } from "@/lib/slots";

export const metadata: Metadata = { title: "Matches", robots: { index: false } };

const LABEL: Record<AdminMatchTab, string> = { upcoming: "Upcoming", past: "Past", cancelled: "Cancelled", all: "All" };

export default async function AdminMatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: AdminMatchTab = ADMIN_MATCH_TABS.includes(rawTab as AdminMatchTab) ? (rawTab as AdminMatchTab) : "upcoming";
  const { rows, names, counts } = await loadAdminMatches(tab);
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Admin" title="Matches" description="Every match posted, with who posted it and who is booked." />
      <Tabs base="/admin/matches" active={tab} tabs={ADMIN_MATCH_TABS.map((t) => ({ value: t, label: LABEL[t], count: counts[t] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={ListIcon} title="No matches here" body="Matches show up as teams post them." />
      ) : (
        <div className="grid gap-6">
          {groupByMonth(rows).map((g) => (
            <section key={g.label}>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{g.label}</h2>
              <ul className="pl-cards grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.rows.map((m) => {
                  const status = adminMatchStatus(m.status, m.ends_at, now);
                  const pending = m.applications.filter((a) => a.status === "pending").length;
                  const keeperIds = m.applications.filter((a) => a.status === "accepted").map((a) => a.goalkeeper_id);
                  return (
                    <li key={m.id} className={status.past ? "opacity-70" : ""}>
                      <MatchCard
                        match={m}
                        href={`/matches/${m.id}`}
                        by={names.get(m.created_by)?.name ?? "A player"}
                        footer={
                          <>
                            <span className="min-w-0 truncate text-muted">
                              {relativeDay(m.starts_at, now)} ·{" "}
                              {keeperIds.length > 0
                                ? `${keeperIds.length > 1 ? "Keepers" : "Keeper"}: ${keeperNames(keeperIds.map((id) => names.get(id)?.name ?? "booked"))}${keeperIds.length < m.keepers_needed ? ` (${keeperIds.length} of ${m.keepers_needed})` : ""}`
                                : `${m.applications.length} ${m.applications.length === 1 ? "application" : "applications"}${pending && !status.past ? `, ${pending} waiting` : ""}`}
                            </span>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          </>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
