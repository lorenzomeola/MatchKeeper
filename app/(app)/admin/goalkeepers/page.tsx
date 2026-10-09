import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { KeeperReviewCard, SearchForm } from "@/components/app/admin-parts";
import { PageHeader } from "@/components/app/page-header";
import { Tabs } from "@/components/app/tabs";
import { ShieldCheckIcon } from "@/components/platform/icons";
import { loadInfoRequests, loadKeepers } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Keepers", robots: { index: false } };

const TABS = ["pending", "approved", "all"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { pending: "In review", approved: "Approved", all: "All" };

export default async function AdminKeepersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: rawTab, q: rawQ } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "pending";
  const q = (rawQ ?? "").trim().slice(0, 60);
  const { list, counts } = await loadKeepers(tab, q);
  const requests = await loadInfoRequests(list.filter((p) => !p.approved).map((p) => p.id));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Keepers"
        description="Review each profile before a keeper can apply to matches. The ones who have been waiting longest come first."
      />
      <Tabs base="/admin/goalkeepers" active={tab} tabs={TABS.map((t) => ({ value: t, label: LABEL[t], count: counts[t === "all" ? "all" : t] }))} />
      <SearchForm base="/admin/goalkeepers" tab={tab} q={q} placeholder="Search keepers by name" />

      {list.length === 0 ? (
        <EmptyState
          icon={ShieldCheckIcon}
          title={q ? "No keepers match that search" : tab === "pending" ? "Nobody waiting" : "No keepers here yet"}
          body={q ? "Try a shorter name." : tab === "pending" ? "Every keeper who signed up has been reviewed." : "Keepers show up here once they sign up."}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => (
            <li key={p.id}>
              <KeeperReviewCard p={p} requests={requests.get(p.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
