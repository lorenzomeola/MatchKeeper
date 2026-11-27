import { CheckIcon } from "@/components/platform/icons";

type StepState = "done" | "current" | "todo";

/** Píldora de reserva confirmada: un check sólido en vez de una etiqueta plana. */
export function BookedPill({ children = "Booked" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-[color-mix(in_oklab,var(--success)_12%,transparent)] py-1 pl-1 pr-3 text-[13px] font-semibold text-success">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-success text-[color:var(--bg)]">
        <CheckIcon className="h-3 w-3" />
      </span>
      {children}
    </span>
  );
}

/** Progreso de una reserva: reservado → check-in → jugado. Lo que ya pasó se ve de un vistazo. */
export function BookingProgress({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ol className="flex items-center" aria-label="Booking progress">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const dot =
          s.state === "done"
            ? "bg-success text-[color:var(--bg)]"
            : s.state === "current"
              ? "border border-accent bg-accent-soft text-accent-strong shadow-[0_0_0_4px_var(--accent-soft)]"
              : "border border-line-strong text-muted";
        const text = s.state === "todo" ? "text-muted" : s.state === "current" ? "text-accent-strong" : "text-fg";
        return (
          <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className={`flex items-center ${last ? "" : "flex-1"}`}>
            <span className="flex items-center gap-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${dot}`}>
                {s.state === "done" ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${text}`}>{s.label}</span>
            </span>
            {!last && (
              <span
                aria-hidden
                className={`mx-2 h-px min-w-3 flex-1 sm:mx-3 ${s.state === "done" ? "bg-success/60" : "bg-line-strong"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
