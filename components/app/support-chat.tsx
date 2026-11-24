"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/components/app/sheet";
import { SendIcon } from "@/components/platform/icons";
import { markSupportReadAction, sendSupportMessageAction } from "@/lib/actions/support";
import type { SupportMessage } from "@/lib/data/support";
import { clockTime, dayLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { SUPPORT_TEMPLATES, fillTemplate, linkifyOwn, type SupportTemplate, type SupportVars } from "@/lib/support-templates";

export type UrgentMatchOption = { id: string; label: string; pitch: string; when: string; url: string };

const GROUP_GAP_MS = 5 * 60_000;

/** Texto del mensaje con los enlaces a la propia app pulsables. */
export function SupportBody({ body, origin }: { body: string; origin: string }) {
  return (
    <>
      {linkifyOwn(body, origin).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} className="font-medium underline underline-offset-2">
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** Chat entre el buzón compartido de admins y un portero. Lo usan las dos partes. */
export function SupportChat({
  keeperId,
  viewer,
  initialMessages,
  seenAt: initialSeenAt = null,
  origin,
  header,
  className,
  templates,
}: {
  keeperId: string;
  viewer: "admin" | "keeper";
  initialMessages: SupportMessage[];
  /** Cuándo leyó el portero por última vez (solo lo ve el admin). */
  seenAt?: string | null;
  origin: string;
  header: ReactNode;
  className: string;
  templates?: { vars: SupportVars; urgentMatches: UrgentMatchOption[] };
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | "templates" | "urgent">(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const markedOnMount = useRef(false);

  const fromOther = useCallback((m: SupportMessage) => (viewer === "admin" ? !m.from_admin : m.from_admin), [viewer]);

  const markRead = useCallback(async () => {
    await markSupportReadAction(keeperId);
    router.refresh();
  }, [keeperId, router]);

  useEffect(() => {
    if (markedOnMount.current) return;
    markedOnMount.current = true;
    if (initialMessages.some(fromOther)) void markRead();
  }, [initialMessages, fromOther, markRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-${keeperId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `keeper_id=eq.${keeperId}` },
        (payload) => {
          const row = payload.new as SupportMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (fromOther(row)) void markRead();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, keeperId, fromOther, markRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function applyDraft(text: string) {
    setDraft(text);
    setSheet(null);
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
    });
  }

  function pickTemplate(t: SupportTemplate) {
    if (!templates) return;
    if (t.id === "urgent_match" && templates.urgentMatches.length > 0) {
      setSheet("urgent");
      return;
    }
    applyDraft(fillTemplate(t.body, { pitch: "[pitch]", when: "[day and time]", matchLink: "[match link]", ...templates.vars }));
  }

  function pickUrgent(m: UrgentMatchOption) {
    if (!templates) return;
    const body = SUPPORT_TEMPLATES.find((t) => t.id === "urgent_match")!.body;
    applyDraft(fillTemplate(body, { ...templates.vars, pitch: m.pitch, when: m.when, matchLink: m.url }));
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const result = await sendSupportMessageAction(keeperId, body);
    setSending(false);
    if (result.error || !result.message) {
      setError(result.error ?? "We couldn't send that message. Try again.");
      return;
    }
    const row = result.message;
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    setDraft("");
    if (textRef.current) textRef.current.style.height = "auto";
    router.refresh();
  }

  const mineOf = (m: SupportMessage) => !fromOther(m);
  const lastMineIndex = messages.findLastIndex(mineOf);
  const seenAt = viewer === "admin" ? initialSeenAt : null;

  return (
    <section className={className}>
      {header}

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 lg:px-5">
        {messages.length === 0 && (
          <div className="grid place-items-center py-10 text-center">
            <p className="pl-display text-fg [font-size:var(--t-xl)]">No messages yet</p>
            <p className="pl-prose mt-2 max-w-[24rem] text-[15px]">
              Pick a template or write your own message. The keeper sees it in their Messages and gets an email if they don&apos;t open it.
            </p>
          </div>
        )}

        <ol className="grid gap-1">
          {messages.map((m, i) => {
            const mine = mineOf(m);
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const apart = (a: SupportMessage, b: SupportMessage) =>
              a.from_admin !== b.from_admin ||
              dayLabel(a.created_at) !== dayLabel(b.created_at) ||
              Date.parse(b.created_at) - Date.parse(a.created_at) > GROUP_GAP_MS;
            const startsGroup = !prev || apart(prev, m);
            const endsGroup = !next || apart(m, next);
            const seen = mine && i === lastMineIndex && seenAt && Date.parse(seenAt) >= Date.parse(m.created_at);

            return (
              <li key={m.id} className={startsGroup && i > 0 ? "mt-3" : ""}>
                {newDay && (
                  <p className="my-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{dayLabel(m.created_at)}</p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[82%] whitespace-pre-wrap break-words rounded-[var(--r-lg)] px-3.5 py-2.5 text-[15px] leading-snug ${
                      mine ? "bg-accent text-accent-ink" : "border border-line bg-bg-3 text-fg"
                    } ${mine && endsGroup ? "rounded-br-[var(--r-xs)]" : ""} ${!mine && endsGroup ? "rounded-bl-[var(--r-xs)]" : ""}`}
                  >
                    <SupportBody body={m.body} origin={origin} />
                  </p>
                </div>
                {endsGroup && (
                  <p className={`mt-1 text-[11px] text-muted ${mine ? "text-right" : "text-left"}`}>
                    {clockTime(m.created_at)}
                    {seen ? " · Seen" : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl lg:bg-transparent lg:pb-3"
      >
        {templates && (
          <button
            type="button"
            onClick={() => setSheet("templates")}
            className="mb-2 inline-flex min-h-9 items-center rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-medium text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
          >
            Use a template
          </button>
        )}
        {error && (
          <p role="alert" className="mb-2 px-1 text-[13px] text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textRef}
            value={draft}
            rows={1}
            maxLength={1000}
            placeholder="Write a message"
            aria-label="Message"
            enterKeyHint="send"
            autoComplete="off"
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`;
            }}
            onKeyDown={(e) => {
              // En móvil Enter es salto de línea; con ratón o teclado físico envía.
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                void send();
              }
            }}
            className="pl-input max-h-48 min-h-12 flex-1 resize-none py-3 leading-snug"
          />
          <button
            type="submit"
            disabled={sending || draft.trim() === ""}
            aria-label="Send message"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r-md)] bg-accent text-accent-ink transition-[transform,opacity] duration-150 active:scale-95 disabled:opacity-40"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

      {templates && (
        <>
          <Sheet open={sheet === "templates"} title="Templates" onClose={() => setSheet(null)}>
            <p className="pl-prose text-[15px]">The text goes into the message box so you can edit it before sending.</p>
            {(["review", "approved"] as const).map((stage) => (
              <div key={stage} className="mt-4">
                <p className="text-xs font-medium text-muted">{stage === "review" ? "Before approval" : "After approval"}</p>
                <ul className="mt-2 grid gap-1.5">
                  {SUPPORT_TEMPLATES.filter((t) => t.stage === stage).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => pickTemplate(t)}
                        className="w-full rounded-[var(--r-md)] border border-line bg-surface px-3.5 py-2.5 text-left transition-colors duration-200 hover:border-accent"
                      >
                        <span className="block text-[15px] font-medium text-fg">{t.label}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{t.body}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Sheet>

          <Sheet open={sheet === "urgent"} title="Which match?" onClose={() => setSheet(null)}>
            <ul className="grid gap-1.5">
              {templates.urgentMatches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => pickUrgent(m)}
                    className="w-full rounded-[var(--r-md)] border border-line bg-surface px-3.5 py-2.5 text-left text-[15px] text-fg transition-colors duration-200 hover:border-accent"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        </>
      )}
    </section>
  );
}
