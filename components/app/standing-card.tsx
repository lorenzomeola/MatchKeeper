import { StatusBadge } from "@/components/app/status-badge";
import type { StandingLevel } from "@/lib/strikes";
import { CONTACT_EMAIL } from "@/lib/site";

const COPY: Record<Exclude<StandingLevel, "good">, { tone: "warning" | "danger"; badge: string; title: string; body: string }> = {
  warned: {
    tone: "warning",
    badge: "Strike",
    title: "You have a strike on your profile",
    body: "Cancelling less than 24 hours before kick-off, or not turning up, adds strikes. Cancel earlier and there is no penalty.",
  },
  review: {
    tone: "warning",
    badge: "Under review",
    title: "Your profile is under review",
    body: "Another late cancellation would suspend you from applying. Cancelling more than 24 hours before kick-off never counts.",
  },
  suspended: {
    tone: "danger",
    badge: "Suspended",
    title: "You can't apply to new matches for now",
    body: "Your games that are already booked still stand. Strikes stop counting after a while, and we can cancel one made by mistake.",
  },
};

/** Aviso al portero de su situación de strikes. No se pinta si está en regla. */
export function StandingCard({ level }: { level: StandingLevel }) {
  if (level === "good") return null;
  const c = COPY[level];
  return (
    <section
      className={`rounded-[var(--r-lg)] border p-5 ${
        c.tone === "danger"
          ? "border-danger/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)]"
          : "border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]"
      }`}
    >
      <StatusBadge tone={c.tone}>{c.badge}</StatusBadge>
      <p className="mt-3 text-[15px] font-semibold text-fg">{c.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
      <p className="mt-2 text-sm text-muted">
        Think it is a mistake?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-strong underline underline-offset-4">
          Write to us
        </a>
        .
      </p>
    </section>
  );
}
