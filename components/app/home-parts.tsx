import Link from "next/link";
import type { ReactNode } from "react";
import { DateTile, MatchChips } from "@/components/app/match-card";
import { ArrowRightIcon, ChatIcon } from "@/components/platform/icons";
import { Button } from "@/components/platform/button";
import { daysAway, longDate, splitAddress, timeRange } from "@/lib/format";

type HeroMatch = Parameters<typeof MatchChips>[0]["match"] & { id: string };

/** Tarjeta principal del Home: el siguiente partido, con fecha grande y la acción que toca. */
export function NextMatchHero({
  eyebrow,
  match,
  href,
  status,
  cta,
}: {
  eyebrow: string;
  match: HeroMatch;
  href: string;
  /** Línea de estado: quién está reservado, cuántos aplicaron. */
  status: ReactNode;
  cta: string;
}) {
  return (
    <section className="pl-surface relative overflow-hidden rounded-[var(--r-xl)] p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent opacity-[0.12] blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="pl-eyebrow">{eyebrow}</p>
          <span className="rounded-[var(--r-xs)] bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-strong">
            {daysAway(match.starts_at)}
          </span>
        </div>

        <div className="mt-5 flex items-start gap-4 sm:gap-5">
          <DateTile iso={match.starts_at} large />
          <div className="min-w-0 flex-1">
            <h2 className="pl-display text-fg [font-size:var(--t-2xl)]">{splitAddress(match.address).name}</h2>
            {splitAddress(match.address).rest && (
              <p className="mt-1 text-sm text-muted">{splitAddress(match.address).rest}</p>
            )}
            <p className="mt-2 text-sm text-fg-2">
              {longDate(match.starts_at)} · {timeRange(match.starts_at, match.ends_at)}
            </p>
            <MatchChips match={match} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">{status}</div>
          <Button href={href} variant="primary" size="md" className="w-full sm:w-auto" withArrow>
            {cta}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Aviso de mensajes sin leer; no se muestra si no hay ninguno. */
export function UnreadNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Link
      href="/messages"
      className="pl-lift group flex items-center gap-3.5 rounded-[var(--r-lg)] border border-accent/40 bg-accent-soft p-4"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-accent text-accent-ink">
        <ChatIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fg">
          {count} unread {count === 1 ? "message" : "messages"}
        </span>
        <span className="block text-[13px] text-muted">Open your inbox to reply.</span>
      </span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-accent-strong transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Aviso de perfil: obligatorios pendientes (alerta) o rating mejorable (discreto). */
export function ProfileNudge({
  percent,
  tier,
  missing,
  hint,
  href = "/profile",
}: {
  percent: number;
  tier: string;
  missing: string[];
  hint: string;
  href?: string;
}) {
  const blocking = missing.length > 0;
  return (
    <Link
      href={href}
      className={`pl-lift group flex items-center gap-4 rounded-[var(--r-lg)] border p-4 ${
        blocking ? "border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]" : "border-line bg-surface"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-[15px] font-semibold text-fg">
            {blocking ? "Finish your profile" : "Make your profile stronger"}
          </p>
          <p className="pl-tnum shrink-0 whitespace-nowrap text-sm font-semibold text-fg-2">
            {tier} · {percent}%
          </p>
        </div>
        <div className="pl-meter mt-2.5">
          <div className="pl-meter__fill" style={{ "--pct": percent / 100 } as React.CSSProperties} />
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {blocking ? `Still needed: ${missing.join(", ").toLowerCase()}.` : hint}
        </p>
      </div>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
