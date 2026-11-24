"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import type { UrgentMatchOption } from "@/components/app/support-chat";
import { useToast } from "@/components/app/toast";
import { broadcastSupportMessageAction } from "@/lib/actions/support";
import { SUPPORT_TEMPLATES, fillTemplate, type SupportVars } from "@/lib/support-templates";

const template = (id: string) => SUPPORT_TEMPLATES.find((t) => t.id === id)!.body;

/** El mismo mensaje a todos los porteros aprobados, cada uno en su propio hilo. */
export function SupportBroadcast({
  approvedCount,
  vars,
  urgentMatches,
}: {
  approvedCount: number;
  /** Variables comunes; {name} se rellena en el servidor para cada portero. */
  vars: SupportVars;
  urgentMatches: UrgentMatchOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState(() => fillTemplate(template("open_matches"), vars));
  const [pending, startTransition] = useTransition();

  const choices = SUPPORT_TEMPLATES.filter((t) => t.stage === "approved" && t.id !== "urgent_match");

  function send() {
    startTransition(async () => {
      const res = await broadcastSupportMessageAction(text);
      if (res.error) {
        toast(res.error, "error");
        setConfirming(false);
        return;
      }
      setOpen(false);
      setConfirming(false);
      toast(res.failed ? `Sent to ${res.sent} keepers. ${res.failed} failed.` : `Sent to ${res.sent} keepers.`, res.failed ? "error" : "success");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={approvedCount === 0}
        className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50"
      >
        Message all approved keepers
      </button>

      <Sheet
        open={open}
        title="Message all approved keepers"
        onClose={() => {
          if (pending) return;
          setOpen(false);
          setConfirming(false);
        }}
      >
        <p className="pl-prose text-[15px]">
          Each keeper gets it in their own conversation with MatchKeeper. <code>{"{name}"}</code> becomes their first name.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {choices.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setText(fillTemplate(t.body, vars))}
                className="rounded-[var(--r-xs)] bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg-2 transition-colors duration-200 hover:text-fg"
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        {urgentMatches.length > 0 && (
          <>
            <label htmlFor="broadcast-urgent" className="mt-4 block text-sm font-medium text-fg">
              Urgent match
            </label>
            <select
              id="broadcast-urgent"
              defaultValue=""
              onChange={(e) => {
                const m = urgentMatches.find((u) => u.id === e.target.value);
                if (m) setText(fillTemplate(template("urgent_match"), { ...vars, pitch: m.pitch, when: m.when, matchLink: m.url }));
              }}
              className="pl-input mt-1.5"
            >
              <option value="" disabled>
                Pick a match to announce
              </option>
              {urgentMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="broadcast-text" className="mt-4 block text-sm font-medium text-fg">
          Message
        </label>
        <textarea
          id="broadcast-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setConfirming(false);
          }}
          maxLength={1000}
          rows={6}
          className="pl-input mt-1.5"
        />
        <div className="mt-5 grid gap-2">
          {confirming ? (
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? "Sending…" : `Yes, send to ${approvedCount} ${approvedCount === 1 ? "keeper" : "keepers"}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={text.trim().length < 10}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              Send to {approvedCount} {approvedCount === 1 ? "keeper" : "keepers"}
            </button>
          )}
          <button
            type="button"
            onClick={() => (confirming ? setConfirming(false) : setOpen(false))}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-medium text-fg-2"
          >
            {confirming ? "Back" : "Cancel"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
