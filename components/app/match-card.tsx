import Link from "next/link";
import type { ReactNode } from "react";
import { Spotlight } from "@/components/app/spotlight";
import { dateTile, money, SURFACE_LABEL, timeRange } from "@/lib/format";
import { durationShort, isDuration, matchMinutes } from "@/lib/pricing";
import { ageRangeText, CATEGORY_CHIP } from "@/lib/profile";

type CardMatch = {
  id: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  level: string | null;
  format: number | null;
  surface: string | null;
  category?: string | null;
  budget_suggested: string | number | null;
  keepers_needed?: number | null;
  pref_age_min?: string | null;
  pref_age_max?: string | null;
};

export function DateTile({ iso, large }: { iso: string; large?: boolean }) {
  const d = dateTile(iso);
  return (
    <span
      className={`grid shrink-0 place-items-center bg-accent-soft text-accent-strong ${
        large ? "h-20 w-20 rounded-[var(--r-lg)]" : "h-14 w-14 rounded-[var(--r-md)]"
      }`}
    >
      <span className="text-center leading-none">
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.16em]">{d.weekday}</span>
        <span className={`pl-display pl-tnum block ${large ? "mt-1 text-3xl" : "mt-0.5 text-xl"}`}>{d.day}</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] opacity-80">{d.month}</span>
      </span>
    </span>
  );
}

export function MatchChips({ match }: { match: CardMatch }) {
  const age = ageRangeText(match.pref_age_min, match.pref_age_max);
  const minutes = matchMinutes(match.starts_at, match.ends_at);
  const two = (match.keepers_needed ?? 1) > 1;
  const chips = [
    match.category ? (CATEGORY_CHIP[match.category] ?? null) : null,
    isDuration(minutes) ? durationShort(minutes) : null,
    two ? `${match.keepers_needed} keepers` : null,
    match.format ? `${match.format}-a-side` : null,
    match.surface ? (SURFACE_LABEL[match.surface] ?? match.surface) : null,
    match.level,
    age ? `Prefers age ${age}` : null,
    money(match.budget_suggested) ? `${money(match.budget_suggested)} budget${two ? " each" : ""}` : null,
  ].filter((c): c is string => !!c);

  if (chips.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={c} className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
          {c}
        </li>
      ))}
    </ul>
  );
}

/** Fila de partido: fecha, lugar, detalles y un pie opcional para estado o acciones. */
export function MatchCard({
  match,
  href,
  by,
  footer,
  actions,
}: {
  match: CardMatch;
  href: string;
  /** Quién lo publica, visto desde el portero. */
  by?: string;
  /** Estado o resumen a la izquierda del pie; no es pulsable por sí mismo (pulsa la tarjeta). */
  footer?: ReactNode;
  /** Botones a la derecha del pie; son enlaces propios, por encima del enlace de la tarjeta. */
  actions?: ReactNode;
}) {
  return (
    <Spotlight className="pl-surface pl-lift relative flex h-full flex-col rounded-[var(--r-lg)] p-4">
      <div className="flex items-start gap-4">
        <DateTile iso={match.starts_at} />
        <div className="min-w-0 flex-1">
          {/* Enlace extendido: toda la tarjeta navega, pero los botones del pie siguen siendo independientes. */}
          <Link href={href} className="block min-w-0 after:absolute after:inset-0 after:content-['']">
            <span className="block truncate text-[15px] font-semibold text-fg">{match.address || "Pitch to be confirmed"}</span>
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {timeRange(match.starts_at, match.ends_at)}
            {by ? ` · ${by}` : ""}
          </p>
          <MatchChips match={match} />
        </div>
      </div>
      {/* En una fila de la cuadrícula, la tarjeta más corta se estira y su pie queda alineado abajo. */}
      {(footer || actions) && (
        <div className="mt-auto pt-4">
          <div className="border-t border-line pt-3 text-sm">
            {footer && <div className="pointer-events-none flex min-w-0 items-center justify-between gap-3">{footer}</div>}
            {actions && <div className={`relative z-10 grid auto-cols-fr grid-flow-col gap-2 ${footer ? "mt-3" : ""}`}>{actions}</div>}
          </div>
        </div>
      )}
    </Spotlight>
  );
}

/** Botón pequeño del pie de una tarjeta: `primary` naranja, `ghost` con borde. */
export function CardAction({
  href,
  variant = "ghost",
  icon,
  children,
}: {
  href: string;
  variant?: "primary" | "ghost";
  icon?: ReactNode;
  children: ReactNode;
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:bg-accent-strong"
      : "border border-line-strong text-fg hover:border-accent hover:text-accent-strong";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--r-sm)] px-3.5 text-[13px] font-semibold transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.97] sm:min-h-10 ${styles}`}
    >
      {icon}
      {children}
    </Link>
  );
}
