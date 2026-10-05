import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { SearchForm, UserRow } from "@/components/app/admin-parts";
import { PageHeader } from "@/components/app/page-header";
import { Tabs } from "@/components/app/tabs";
import { UsersIcon } from "@/components/platform/icons";
import { loadUsers } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

const TABS = ["all", "player", "goalkeeper"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { all: "Everyone", player: "Players and teams", goalkeeper: "Keepers" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: rawTab, q: rawQ } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "all";
  const q = (rawQ ?? "").trim().slice(0, 60);
  const { list, counts } = await loadUsers(tab, q);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description="Everyone who signed up, newest first. Open a profile to see their activity." />
      <Tabs base="/admin/users" active={tab} tabs={TABS.map((t) => ({ value: t, label: LABEL[t], count: counts[t] }))} />
      <SearchForm base="/admin/users" tab={tab} q={q} placeholder="Search by name" />

      {list.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" body={q ? "Try a shorter name." : "Nobody has signed up yet."} />
      ) : (
        <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
          {list.map((p) => (
            <li key={p.id}>
              <UserRow p={p} />
            </li>
          ))}
        </ul>
      )}
      {list.length === 100 && <p className="mt-3 text-[13px] text-muted">Showing the first 100. Use the search to narrow it down.</p>}
    </>
  );
}
