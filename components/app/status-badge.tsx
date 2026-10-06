type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-2",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success",
  warning: "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning",
  danger: "bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] text-danger",
};

/** Estado de partido, aplicación o portero. Cuadrado con esquinas suaves, no píldora. */
export function StatusBadge({
  tone = "neutral",
  children,
  dot,
}: {
  tone?: Tone;
  children: React.ReactNode;
  /** Punto pulsante para estados vivos (abierto). */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--r-xs)] px-2 py-1 text-xs font-semibold ${TONES[tone]}`}
    >
      {dot && <span aria-hidden className="pl-pulse h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const MATCH_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "success" },
  assigned: { label: "Keeper booked", tone: "accent" },
  completed: { label: "Played", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const APPLICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "warning" },
  accepted: { label: "Accepted", tone: "accent" },
  rejected: { label: "Not chosen", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};
