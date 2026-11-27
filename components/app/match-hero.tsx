import Link from "next/link";
import { DateTile } from "@/components/app/match-card";
import { Spotlight } from "@/components/app/spotlight";
import { ClockIcon, PencilIcon, PinIcon } from "@/components/platform/icons";
import { longDate, money, splitAddress, SURFACE_LABEL, timeRange } from "@/lib/format";
import { durationText, isDuration, matchMinutes } from "@/lib/pricing";
import { ageRangeText, CATEGORY_CHIP } from "@/lib/profile";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const PILL: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface text-fg-2",
  accent: "border-accent/40 bg-accent-soft text-accent-strong",
  success: "border-success/35 bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-success",
  warning: "border-warning/40 bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] text-warning",
  danger: "border-danger/40 bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger",
};

type HeroMatch = {
  id: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  lat: number;
  lng: number;
  notes: string | null;
  level: string | null;
  format: number | null;
  surface: string | null;
  category?: string | null;
  budget_suggested: string | number | null;
  keepers_needed: number | null;
  pref_age_min?: string | null;
  pref_age_max?: string | null;
};

function Fact({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-[var(--r-md)] border border-line bg-surface px-3.5 py-3">
      <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold leading-tight text-fg">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

/** Cabecera de un partido: estado, fecha, datos clave y, abajo a la derecha, las acciones (mapa y editar). */
export function MatchHero({
  match,
  status,
  live,
  countdown,
  posterName,
  canEdit,
  editNote,
  booked,
}: {
  match: HeroMatch;
  status: { label: string; tone: Tone };
  /** Partido abierto y por jugar: el estado lleva un punto pulsante. */
  live: boolean;
  /** "In 2 days", "Today"... o null si ya no aplica. */
  countdown: string | null;
  /** Quien lo publica, visto desde el portero. */
  posterName?: string;
  canEdit: boolean;
  /** Aviso bajo el pie cuando solo se pueden editar las notas. */
  editNote?: string;
  booked: number;
}) {
  const pitch = splitAddress(match.address);
  const minutes = matchMinutes(match.starts_at, match.ends_at);
  const two = (match.keepers_needed ?? 1) > 1;
  const budget = money(match.budget_suggested);
  const age = ageRangeText(match.pref_age_min, match.pref_age_max);
  const extras = [
    match.category ? (CATEGORY_CHIP[match.category] ?? null) : null,
    two ? `2 keepers \u00b7 ${booked} booked` : null,
    age ? `Prefers age ${age}` : null,
  ].filter((c): c is string => !!c);

  return (
    <Spotlight className="pl-surface relative overflow-hidden rounded-[var(--r-xl)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent opacity-[0.12] blur-3xl"
      />
      <svg
        aria-hidden
        viewBox="0 0 400 240"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute -right-8 top-10 hidden h-56 w-auto text-fg opacity-[0.05] sm:block"
      >
        <rect x="10" y="10" width="380" height="220" rx="8" />
        <path d="M200 10v220" />
        <circle cx="200" cy="120" r="44" />
        <rect x="10" y="68" width="62" height="104" />
        <rect x="328" y="68" width="62" height="104" />
      </svg>

      <div className="relative p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${PILL[status.tone]}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-current ${live ? "pl-pulse" : ""}`} />
            {status.label}
          </span>
          {countdown && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent-strong">
              <ClockIcon className="h-3.5 w-3.5" />
              {countdown}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-start gap-4 sm:gap-5">
          <DateTile iso={match.starts_at} large />
          <div className="min-w-0 flex-1">
            <h1 className="pl-display text-fg [font-size:var(--t-3xl)]">{pitch.name}</h1>
            {pitch.rest && <p className="mt-1.5 text-sm text-muted">{pitch.rest}</p>}
            <p className="mt-2 text-sm font-medium text-fg-2">{longDate(match.starts_at)}</p>
            {posterName && <p className="mt-1 text-sm text-muted">Posted by {posterName}</p>}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Fact label="Kick-off" value={timeRange(match.starts_at, match.ends_at)} sub={isDuration(minutes) ? durationText(minutes) : null} />
          <Fact
            label="Format"
            value={match.format ? `${match.format}-a-side` : "Not set"}
            sub={match.surface ? (SURFACE_LABEL[match.surface] ?? match.surface) : null}
          />
          <Fact label="Level" value={match.level ?? "Any level"} />
          <Fact label="Budget" value={budget ?? "Not set"} sub={budget ? (two ? "per keeper" : "suggested") : null} />
        </dl>

        {extras.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {extras.map((c) => (
              <li key={c} className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
                {c}
              </li>
            ))}
          </ul>
        )}

        {match.notes && (
          <p className="mt-4 rounded-[var(--r-md)] border-l-2 border-accent bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">
            <span className="mb-0.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Notes</span>
            {match.notes}
          </p>
        )}
      </div>

      <div className="relative flex flex-col gap-3 border-t border-line bg-[color-mix(in_oklab,var(--bg)_45%,transparent)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[13px] leading-snug text-muted sm:max-w-[18rem]">{editNote ?? ""}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0 sm:items-center">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border border-line-strong px-3 text-sm font-semibold text-fg transition-[border-color,color,transform] duration-200 hover:border-accent hover:text-accent-strong active:scale-[0.98] sm:px-4 ${canEdit ? "" : "col-span-2"}`}
          >
            <PinIcon className="h-4 w-4 text-accent" />
            Open in Maps
          </a>
          {canEdit && (
            <Link
              href={`/matches/${match.id}/edit`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-md)] bg-accent px-4 text-sm font-semibold text-accent-ink transition-[background-color,transform] duration-150 hover:bg-accent-strong active:scale-[0.98]"
            >
              <PencilIcon className="h-4 w-4" />
              Edit match
            </Link>
          )}
        </div>
      </div>
    </Spotlight>
  );
}
