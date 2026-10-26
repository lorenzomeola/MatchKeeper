import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ReportActions } from "@/components/app/admin-controls";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Tabs } from "@/components/app/tabs";
import { FlagIcon } from "@/components/platform/icons";
import { loadReports } from "@/lib/data/admin";
import { dateTile } from "@/lib/format";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

const TABS = ["open", "reviewed", "dismissed"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { open: "Open", reviewed: "Reviewed", dismissed: "Dismissed" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "open";
  const { rows, names, counts } = await loadReports(tab);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Reports" description="People reported from a conversation. Read what was said before you decide." />
      <Tabs base="/admin/reports" active={tab} tabs={TABS.map((t) => ({ value: t, label: LABEL[t], count: counts[t] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={FlagIcon} title={tab === "open" ? "No open reports" : "Nothing here"} body="Reports show up when someone reports a conversation." />
      ) : (
        <ul className="pl-cards grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const t = dateTile(r.created_at);
            return (
              <li key={r.id}>
                <article className="pl-surface flex flex-col rounded-[var(--r-lg)] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-fg">{r.reason}</p>
                    <StatusBadge tone={r.status === "open" ? "danger" : "neutral"}>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted">
                    <Link href={`/admin/users/${r.reporter_id}`} className="font-medium text-fg-2 hover:underline">
                      {names.get(r.reporter_id)?.name ?? "Someone"}
                    </Link>{" "}
                    reported{" "}
                    <Link href={`/admin/users/${r.reported_id}`} className="font-medium text-fg-2 hover:underline">
                      {names.get(r.reported_id)?.name ?? "a user"}
                    </Link>{" "}
                    on {t.day} {t.month}
                  </p>
                  {r.details && <p className="mt-3 rounded-[var(--r-md)] bg-surface px-3 py-2.5 text-sm text-fg-2">{r.details}</p>}
                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <ReportActions reportId={r.id} status={r.status} />
                      <Link href={`/admin/reports/${r.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4">
                        Read the conversation
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
