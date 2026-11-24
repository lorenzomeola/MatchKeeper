"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import type { UrgentMatchOption } from "@/components/app/support-chat";
import { useToast } from "@/components/app/toast";
import { broadcastSupportMessageAction } from "@/lib/actions/support";
import { SUPPORT_TEMPLATES, fillTemplate, type SupportVars } from "@/lib/support-templates";

const template = (id: string) => SUPPORT_TEMPLATES.find((t) => t.id === id)!.body;

type BroadcastTemplate = "open_matches" | "urgent_match" | "inactive";

// "Welcome" no está aquí: se envía solo al aprobar a cada portero.
const OPTIONS: { id: BroadcastTemplate; label: string; hint: string }[] = [
  { id: "open_matches", label: "Open matches", hint: "Tells them how many matches need a keeper right now, with a link to the map." },
  { id: "urgent_match", label: "Urgent match", hint: "Announces one specific match that needs a keeper soon." },
  { id: "inactive", label: "Haven't seen you", hint: "Asks keepers who stopped applying what is getting in the way." },
];

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
  const [templateId, setTemplateId] = useState<BroadcastTemplate>("open_matches");
  const [matchId, setMatchId] = useState("");
  const [text, setText] = useState(() => fillTemplate(template("open_matches"), vars));
  const [edited, setEdited] = useState(false);
  const [pending, startTransition] = useTransition();

  const options = OPTIONS.filter((o) => o.id !== "urgent_match" || urgentMatches.length > 0);
  const selected = OPTIONS.find((o) => o.id === templateId)!;

  function draftFor(id: BroadcastTemplate, match: string) {
    if (id !== "urgent_match") return fillTemplate(template(id), vars);
    const m = urgentMatches.find((u) => u.id === match);
    return m ? fillTemplate(template(id), { ...vars, pitch: m.pitch, when: m.when, matchLink: m.url }) : "";
  }

  function choose(id: BroadcastTemplate, match = matchId) {
    setTemplateId(id);
    setMatchId(match);
    setText(draftFor(id, match));
    setEdited(false);
    setConfirming(false);
  }

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

        <label htmlFor="broadcast-template" className="mt-4 block text-sm font-medium text-fg">
          1. Template
        </label>
        <select
          id="broadcast-template"
          value={templateId}
          onChange={(e) => choose(e.target.value as BroadcastTemplate)}
          className="pl-input mt-1.5"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[13px] text-muted">{selected.hint}</p>

        {templateId === "urgent_match" && (
          <>
            <label htmlFor="broadcast-match" className="mt-4 block text-sm font-medium text-fg">
              2. Match to announce
            </label>
            <select id="broadcast-match" value={matchId} onChange={(e) => choose("urgent_match", e.target.value)} className="pl-input mt-1.5">
              <option value="" disabled>
                Pick a match
              </option>
              {urgentMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </>
        )}

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <label htmlFor="broadcast-text" className="block text-sm font-medium text-fg">
            {templateId === "urgent_match" ? "3." : "2."} Message
          </label>
          {edited ? (
            <button
              type="button"
              onClick={() => choose(templateId)}
              className="text-[13px] font-medium text-accent-strong underline underline-offset-4"
            >
              Edited · reset to template
            </button>
          ) : (
            <span className="text-[13px] text-muted">From template: {selected.label}</span>
          )}
        </div>
        <textarea
          id="broadcast-text"
          value={text}
          placeholder={templateId === "urgent_match" && !matchId ? "Pick a match first." : undefined}
          onChange={(e) => {
            setText(e.target.value);
            setEdited(true);
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
