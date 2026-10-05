import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { MatchCard } from "@/components/app/match-card";
import { PageHeader } from "@/components/app/page-header";
import { MATCH_STATUS, StatusBadge } from "@/components/app/status-badge";
import { Tabs } from "@/components/app/tabs";
import { ListIcon } from "@/components/platform/icons";
import { loadAdminMatches } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Matches", robots: { index: false } };

const TABS = ["open", "booked", "past", "cancelled"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { open: "Open", booked: "Booked", past: "Past", cancelled: "Cancelled" };

export default async function AdminMatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "open";
  const { rows, names, counts } = await loadAdminMatches(tab);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Matches" description="Every match posted, with who posted it and who is booked." />
      <Tabs base="/admin/matches" active={tab} tabs={TABS.map((t) => ({ value: t, label: LABEL[t], count: counts[t] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={ListIcon} title="No matches here" body="Matches show up as teams post them." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((m) => {
            const status = MATCH_STATUS[m.status] ?? MATCH_STATUS.open;
            const pending = m.applications.filter((a) => a.status === "pending").length;
            const keeperId = m.applications.find((a) => a.status === "accepted")?.goalkeeper_id;
            return (
              <li key={m.id}>
                <MatchCard
                  match={m}
                  href={`/matches/${m.id}`}
                  by={names.get(m.created_by)?.name ?? "A player"}
                  footer={
                    <>
                      <span className="min-w-0 truncate text-muted">
                        {keeperId
                          ? `Keeper: ${names.get(keeperId)?.name ?? "booked"}`
                          : `${m.applications.length} ${m.applications.length === 1 ? "application" : "applications"}${pending ? `, ${pending} waiting` : ""}`}
                      </span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
