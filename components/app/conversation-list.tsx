"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { EmptyState } from "@/components/app/empty-state";
import { ChatIcon } from "@/components/platform/icons";
import type { Conversation } from "@/lib/data/messages";
import { dateTile, shortWhen } from "@/lib/format";

/** Columna de conversaciones. En móvil se oculta mientras hay un hilo abierto. */
export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname();
  const activeId = pathname.split("/")[2];
  const threadOpen = Boolean(activeId);

  return (
    <aside className={`${threadOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col lg:h-full`}>
      <div className="pb-4 pt-2 lg:px-1">
        <p className="pl-eyebrow">Inbox</p>
        <h1 className="pl-display mt-2 text-fg [font-size:var(--t-4xl)]">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={ChatIcon}
          title="No conversations yet"
          body="A conversation starts when a team writes to a keeper who applied to their match. It shows up here."
        />
      ) : (
        <ul className="pl-surface min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain rounded-[var(--r-lg)]">
          {conversations.map((c) => {
            const active = c.applicationId === activeId;
            const t = dateTile(c.matchStartsAt);
            return (
              <li key={c.applicationId}>
                <Link
                  href={`/messages/${c.applicationId}`}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-[4.75rem] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface aria-[current=page]:bg-accent-soft"
                >
                  <Avatar name={c.other.name} src={c.other.avatarUrl} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[15px] ${c.unread > 0 ? "font-semibold text-fg" : "font-medium text-fg"}`}>
                        {c.other.name}
                      </span>
                      {c.last && <span className="shrink-0 text-xs text-muted">{shortWhen(c.last.createdAt)}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {t.weekday} {t.day} {t.month} · {c.matchAddress}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread > 0 ? "text-fg" : "text-muted"}`}>
                        {c.last ? `${c.last.mine ? "You: " : ""}${c.last.body}` : ""}
                      </span>
                      {c.unread > 0 && (
                        <span className="pl-tnum grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
