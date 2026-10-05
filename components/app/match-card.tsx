import Link from "next/link";
import type { ReactNode } from "react";
import { dateTile, money, SURFACE_LABEL, timeRange } from "@/lib/format";

type CardMatch = {
  id: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  level: string | null;
  format: number | null;
  surface: string | null;
  budget_suggested: string | number | null;
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
  const chips = [
    match.format ? `${match.format}-a-side` : null,
    match.surface ? (SURFACE_LABEL[match.surface] ?? match.surface) : null,
    match.level,
    money(match.budget_suggested) ? `${money(match.budget_suggested)} budget` : null,
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
}: {
  match: CardMatch;
  href: string;
  /** Quién lo publica, visto desde el portero. */
  by?: string;
  footer?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="pl-surface pl-lift block rounded-[var(--r-lg)] p-4 transition-colors"
    >
      <div className="flex items-start gap-4">
        <DateTile iso={match.starts_at} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-fg">{match.address || "Pitch to be confirmed"}</p>
          <p className="mt-0.5 text-sm text-muted">
            {timeRange(match.starts_at, match.ends_at)}
            {by ? ` · ${by}` : ""}
          </p>
          <MatchChips match={match} />
        </div>
      </div>
      {footer && <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">{footer}</div>}
    </Link>
  );
}
