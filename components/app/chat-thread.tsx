"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { Sheet } from "@/components/app/sheet";
import { StatusBadge } from "@/components/app/status-badge";
import { useToast } from "@/components/app/toast";
import { ArrowLeftIcon, BlockIcon, FlagIcon, InfoIcon, MoreIcon, SendIcon } from "@/components/platform/icons";
import type { ChatMessage, Thread } from "@/lib/data/messages";
import { clockTime, dateTile, dayLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const STARTERS = [
  "Hi, does the kick-off time work for you?",
  "Are you happy with the pitch location?",
  "Do you bring your own gloves?",
];

const REPORT_REASONS = [
  "Asked to pay or talk outside MatchKeeper",
  "Rude or abusive",
  "Spam or scam",
  "Something else",
];

const GROUP_GAP_MS = 5 * 60_000;

export function ChatThread({ thread, userId }: { thread: Thread; userId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<ChatMessage[]>(thread.messages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenAt, setSeenAt] = useState<string | null>(thread.otherReadAt);
  const [sheet, setSheet] = useState<null | "menu" | "report" | "block">(null);
  const [blockedByMe, setBlockedByMe] = useState(thread.blockedByMe);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const markedOnMount = useRef(false);
  const closeSheet = useCallback(() => setSheet(null), []);

  const { applicationId } = thread;
  const otherId = thread.other.id;

  const markRead = useCallback(async () => {
    await supabase.rpc("mark_thread_read", { p_application_id: applicationId });
    router.refresh();
  }, [supabase, applicationId, router]);

  useEffect(() => {
    if (markedOnMount.current) return;
    markedOnMount.current = true;
    if (thread.messages.some((m) => m.sender_id !== userId)) void markRead();
  }, [thread.messages, userId, markRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${applicationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `application_id=eq.${applicationId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (row.sender_id !== userId) void markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reads", filter: `application_id=eq.${applicationId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string };
          if (row.user_id === otherId && row.last_read_at) setSeenAt(row.last_read_at);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, applicationId, userId, otherId, markRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const closed =
    thread.appStatus === "rejected" || thread.appStatus === "withdrawn" || thread.matchStatus === "cancelled";
  const restricted = thread.appStatus !== "accepted";
  const waitingForTeam = !thread.iAmPlayer && restricted && messages.length === 0;

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("send_message", {
      p_application_id: applicationId,
      p_body: body,
    });
    setSending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const row = data as ChatMessage;
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    setDraft("");
    if (textRef.current) textRef.current.style.height = "auto";
    router.refresh();
  }

  async function report() {
    setBusy(true);
    const { error: e } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: otherId,
      application_id: applicationId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (e) {
      toast("We couldn't send the report. Try again.", "error");
      return;
    }
    setDetails("");
    setSheet(null);
    toast("Report sent. A person will review it.");
  }

  async function setBlock(block: boolean) {
    setBusy(true);
    const { error: e } = block
      ? await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: otherId })
      : await supabase.from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", otherId);
    setBusy(false);
    if (e) {
      toast("That didn't work. Try again.", "error");
      return;
    }
    setBlockedByMe(block);
    setSheet(null);
    toast(block ? `${thread.other.name} is blocked.` : `${thread.other.name} is unblocked.`);
  }

  const lastMineIndex = messages.findLastIndex((m) => m.sender_id === userId);
  const t = dateTile(thread.matchStartsAt);

  return (
    <section className="flex h-dvh flex-col bg-bg lg:h-full lg:overflow-hidden lg:rounded-[var(--r-xl)] lg:border lg:border-line lg:bg-bg-2">
      <header className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:px-5 lg:pt-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:text-fg lg:hidden"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        {thread.other.role === "goalkeeper" ? (
          <Link href={`/keepers/${thread.other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={thread.other.name} src={thread.other.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{thread.other.name}</p>
              <p className="truncate text-xs text-muted">{thread.otherLabel} · View profile</p>
            </div>
          </Link>
        ) : (
          <>
            <Avatar name={thread.other.name} src={thread.other.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{thread.other.name}</p>
              <p className="truncate text-xs text-muted">{thread.otherLabel}</p>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setSheet("menu")}
          aria-label="Conversation options"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:text-fg"
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </header>

      <Link
        href={`/matches/${thread.matchId}`}
        className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 transition-colors duration-200 hover:bg-surface-2 lg:px-5"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-sm)] bg-accent-soft leading-none text-accent-strong">
          <span className="text-center">
            <span className="pl-display pl-tnum block text-base">{t.day}</span>
            <span className="block font-mono text-[9px] uppercase tracking-wider">{t.month}</span>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{thread.matchAddress}</span>
          <span className="block truncate text-xs text-muted">
            {thread.iAmPlayer ? "Applied at" : "Your rate"} {money(thread.rate)}
          </span>
        </span>
        {thread.appStatus === "accepted" ? (
          <StatusBadge tone="success">Booked</StatusBadge>
        ) : (
          <span className="text-xs font-semibold text-accent-strong">View match</span>
        )}
      </Link>

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 lg:px-5">
        {restricted && !closed && (
          <p className="mb-4 flex items-start gap-2 rounded-[var(--r-md)] bg-surface px-3 py-2.5 text-[13px] leading-snug text-muted">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Phone numbers, emails and links are blocked until a keeper is booked. Keep the chat here.
          </p>
        )}

        {messages.length === 0 && (
          <div className="grid place-items-center py-10 text-center">
            <p className="pl-display text-fg [font-size:var(--t-xl)]">
              {waitingForTeam ? "The team writes first" : "No messages yet"}
            </p>
            <p className="pl-prose mt-2 max-w-[22rem] text-[15px]">
              {waitingForTeam
                ? "You applied to this match. If the team wants to know more, their message will show up here."
                : thread.iAmPlayer
                  ? "Ask about the rate, the pitch or anything else before you choose."
                  : "Say hello and confirm the details."}
            </p>
            {thread.iAmPlayer && !closed && !blockedByMe && (
              <ul className="mt-5 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(s);
                        textRef.current?.focus();
                      }}
                      className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ol className="grid gap-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === userId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const apart = (a: ChatMessage, b: ChatMessage) =>
              a.sender_id !== b.sender_id ||
              dayLabel(a.created_at) !== dayLabel(b.created_at) ||
              Date.parse(b.created_at) - Date.parse(a.created_at) > GROUP_GAP_MS;
            const startsGroup = !prev || apart(prev, m);
            const endsGroup = !next || apart(m, next);
            const seen = mine && i === lastMineIndex && seenAt && Date.parse(seenAt) >= Date.parse(m.created_at);

            return (
              <li key={m.id} className={startsGroup && i > 0 ? "mt-3" : ""}>
                {newDay && (
                  <p className="my-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    {dayLabel(m.created_at)}
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[82%] whitespace-pre-wrap break-words rounded-[var(--r-lg)] px-3.5 py-2.5 text-[15px] leading-snug ${
                      mine
                        ? "bg-accent text-accent-ink"
                        : "border border-line bg-bg-3 text-fg"
                    } ${mine && endsGroup ? "rounded-br-[var(--r-xs)]" : ""} ${!mine && endsGroup ? "rounded-bl-[var(--r-xs)]" : ""}`}
                  >
                    {m.body}
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

      {closed || blockedByMe || thread.blockedMe || waitingForTeam ? (
        <footer className="border-t border-line px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 text-center text-sm text-muted lg:pb-4">
          {closed ? (
            thread.appStatus === "rejected" ? (
              "The team chose another keeper. This conversation is closed."
            ) : (
              "This conversation is closed."
            )
          ) : blockedByMe ? (
            <span>
              You blocked {thread.other.name}.{" "}
              <button
                type="button"
                onClick={() => setBlock(false)}
                disabled={busy}
                className="font-semibold text-accent-strong underline underline-offset-4"
              >
                Unblock
              </button>
            </span>
          ) : thread.blockedMe ? (
            "You can't message this person."
          ) : (
            "You can reply once the team writes to you."
          )}
        </footer>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="border-t border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl lg:bg-transparent lg:pb-3"
        >
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
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
              onKeyDown={(e) => {
                // En móvil Enter es salto de línea; con ratón o teclado físico envía.
                if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="pl-input max-h-32 min-h-12 flex-1 resize-none py-3 leading-snug"
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
      )}

      <Sheet open={sheet === "menu"} title="Conversation options" onClose={closeSheet}>
        <ul className="grid gap-1">
          <li>
            <button
              type="button"
              onClick={() => setSheet("report")}
              className="flex min-h-12 w-full items-center gap-3 rounded-[var(--r-md)] px-3 text-left text-[15px] font-medium text-fg transition-colors duration-200 hover:bg-surface"
            >
              <FlagIcon className="h-5 w-5 text-muted" />
              Report this person
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => (blockedByMe ? void setBlock(false) : setSheet("block"))}
              className="flex min-h-12 w-full items-center gap-3 rounded-[var(--r-md)] px-3 text-left text-[15px] font-medium text-fg transition-colors duration-200 hover:bg-surface"
            >
              <BlockIcon className="h-5 w-5 text-muted" />
              {blockedByMe ? "Unblock" : "Block"}
            </button>
          </li>
        </ul>
      </Sheet>

      <Sheet open={sheet === "report"} title="Report this person" onClose={closeSheet}>
        <fieldset className="grid gap-2">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--r-md)] border border-line px-3 text-[15px] text-fg transition-colors duration-200 has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-[var(--accent)]"
              />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          placeholder="Anything else we should know (optional)"
          aria-label="Details"
          className="pl-input mt-3"
        />
        <button
          type="button"
          onClick={report}
          disabled={busy}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send report"}
        </button>
      </Sheet>

      <Sheet open={sheet === "block"} title={`Block ${thread.other.name}?`} onClose={closeSheet}>
        <p className="pl-prose text-[15px]">
          Neither of you will be able to send messages in this conversation. You can unblock at any time.
        </p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => setBlock(true)}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-danger px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Blocking…" : "Block"}
          </button>
          <button
            type="button"
            onClick={closeSheet}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-medium text-fg-2"
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </section>
  );
}
