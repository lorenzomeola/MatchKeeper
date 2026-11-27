import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { SupportBroadcast } from "@/components/app/support-broadcast";
import { ChatIcon } from "@/components/platform/icons";
import { loadOpenMatchOptions, loadSupportInbox } from "@/lib/data/support";
import { shortWhen } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { createClient } from "@/lib/supabase/server";
import { openMatchesPhrase } from "@/lib/support-templates";

export const metadata: Metadata = { title: "Inbox", robots: { index: false } };

export default async function AdminInboxPage() {
  const supabase = await createClient();
  const origin = appUrl();
  const [rows, open, { count: approved }, { count: players }] = await Promise.all([
    loadSupportInbox(),
    loadOpenMatchOptions(origin),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "goalkeeper").eq("approved", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player").eq("is_admin", false),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Inbox"
        description="Your conversations with keepers and players. Every admin shares this inbox, and users see it as the MatchKeeper team."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <SupportBroadcast
          audience="keeper"
          recipientCount={approved ?? 0}
          vars={{ openMatches: openMatchesPhrase(open.count), browseLink: `${origin}/map`, profileLink: `${origin}/profile` }}
          urgentMatches={open.options}
        />
        <SupportBroadcast audience="player" recipientCount={players ?? 0} vars={{}} urgentMatches={[]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ChatIcon}
          title="No conversations yet"
          body="Start one from a user's page in Users, or message all approved keepers or all players at once."
        />
      ) : (
        <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
          {rows.map((r) => (
            <li key={r.keeperId}>
              <Link
                href={`/admin/inbox/${r.keeperId}`}
                className="flex min-h-[4.75rem] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface"
              >
                <Avatar name={r.name} src={r.avatarUrl} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`flex min-w-0 items-center gap-2 text-[15px] text-fg ${r.unread > 0 ? "font-semibold" : "font-medium"}`}>
                      <span className="truncate">{r.name}</span>
                      {r.role === "player" ? (
                        <StatusBadge>Player</StatusBadge>
                      ) : (
                        <StatusBadge tone={r.approved ? "success" : "warning"}>{r.approved ? "Approved" : "In review"}</StatusBadge>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{shortWhen(r.lastMessageAt)}</span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${r.unread > 0 ? "text-fg" : "text-muted"}`}>
                      {r.last ? `${r.last.fromAdmin ? "MatchKeeper: " : ""}${r.last.body}` : ""}
                    </span>
                    {r.unread > 0 && (
                      <span className="pl-tnum grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
                        {r.unread > 9 ? "9+" : r.unread}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
