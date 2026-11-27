"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { BookedPill } from "@/components/app/booking-progress";
import { trackPointer } from "@/components/app/spotlight";
import { StatusBadge } from "@/components/app/status-badge";
import { ArrowRightIcon, ChatIcon, UsersIcon } from "@/components/platform/icons";
import { money } from "@/lib/format";
import { durationText, isDuration } from "@/lib/pricing";

export type Applicant = {
  id: string;
  keeperId: string;
  rate: number;
  message: string | null;
  createdAt: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  level: string | null;
  experienceYears: number | null;
  ageRange: string | null;
  clips: number;
};

const SORTS = [
  { value: "rate", label: "Lowest rate" },
  { value: "experience", label: "Most experience" },
  { value: "recent", label: "Newest first" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export function ApplicantList({
  matchId,
  applicants,
  minutes,
  free = false,
  newIds = [],
}: {
  matchId: string;
  applicants: Applicant[];
  minutes: number;
  /** Beta sin pagos: elegir portero no cobra nada. */
  free?: boolean;
  /** Aplicaciones que el equipo aún no había visto al abrir la página. */
  newIds?: string[];
}) {
  const [sort, setSort] = useState<Sort>("rate");
  // Al marcarlas como vistas la página se refresca sin ellas: se conservan las de esta visita.
  const [fresh, setFresh] = useState(() => new Set(newIds));
  if (newIds.some((id) => !fresh.has(id))) setFresh(new Set([...fresh, ...newIds]));

  const sorted = [...applicants].sort((a, b) => {
    if (sort === "experience") return (b.experienceYears ?? -1) - (a.experienceYears ?? -1) || a.rate - b.rate;
    if (sort === "recent") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return a.rate - b.rate;
  });
  const lowest = Math.min(...applicants.map((a) => a.rate));
  const freshCount = applicants.filter((a) => fresh.has(a.id)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-2">
            <UsersIcon className="h-3.5 w-3.5 text-accent" />
            {applicants.length} {applicants.length === 1 ? "keeper" : "keepers"} applied
          </span>
          {freshCount > 0 && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent-strong">
              <span aria-hidden className="pl-pulse h-2 w-2 rounded-full bg-accent" />
              {freshCount === 1 ? "1 new since your last visit" : `${freshCount} new since your last visit`}
            </span>
          )}
        </div>
        {applicants.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="pl-input min-h-11 w-auto py-1.5 pr-8 text-sm"
              aria-label="Sort applicants"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-3.5">
        {sorted.map((a) => {
          const isNew = fresh.has(a.id);
          const isLowest = applicants.length > 1 && a.rate === lowest;
          const facts = [
            a.experienceYears != null ? `${a.experienceYears} ${a.experienceYears === 1 ? "year" : "years"} as a keeper` : null,
            a.level,
            a.ageRange ? `Age ${a.ageRange}` : null,
          ].filter((f): f is string => !!f);
          return (
            <li key={a.id} className="relative">
              {isNew && (
                <span className="absolute -top-2.5 left-5 z-10 rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink shadow-[0_2px_10px_var(--accent-glow)]">
                  New
                </span>
              )}
              <article
                onPointerMove={trackPointer}
                className={`pl-surface pl-spotlight overflow-hidden rounded-[var(--r-lg)] ${isNew ? "!border-accent" : ""}`}
              >
                <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
                  <Link href={`/keepers/${a.keeperId}`} aria-label={`${a.name}'s profile`} className="shrink-0">
                    <Avatar name={a.name} src={a.avatarUrl} size="lg" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/keepers/${a.keeperId}`} className="group min-w-0">
                        <p className="truncate text-base font-semibold text-fg transition-colors duration-200 group-hover:text-accent-strong">{a.name}</p>
                        <p className="mt-0.5 text-[13px] text-muted">{a.city ?? "London"} · View profile</p>
                      </Link>
                      <div
                        className={`shrink-0 rounded-[var(--r-md)] px-3 py-2 text-right ${isLowest ? "bg-[color-mix(in_oklab,var(--success)_12%,transparent)]" : "bg-accent-soft"}`}
                      >
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                          {isLowest ? "Lowest rate" : "Rate"}
                        </p>
                        <p className={`pl-display pl-tnum [font-size:var(--t-2xl)] ${isLowest ? "text-success" : "text-fg"}`}>{money(a.rate)}</p>
                        {isDuration(minutes) && <p className="text-[11px] text-muted">for {durationText(minutes)}</p>}
                      </div>
                    </div>

                    {(facts.length > 0 || a.clips > 0) && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {a.clips > 0 && (
                          <li>
                            <Link
                              href={`/keepers/${a.keeperId}`}
                              className="inline-flex rounded-[var(--r-xs)] bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-strong"
                            >
                              Watch {a.clips} {a.clips === 1 ? "clip" : "clips"}
                            </Link>
                          </li>
                        )}
                        {facts.map((f) => (
                          <li key={f} className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {(a.bio || a.message) && (
                  <div className="grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
                    {a.bio && <p className="line-clamp-3 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{a.bio}</p>}
                    {a.message && (
                      <p className="rounded-r-[var(--r-md)] border-l-2 border-accent bg-surface px-3.5 py-2.5 text-sm leading-snug text-fg-2">
                        <span className="mb-0.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Their message</span>
                        {a.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 border-t border-line bg-surface p-3 sm:p-4">
                  <Link
                    href={`/messages/${a.id}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] border border-line-strong text-[15px] font-medium text-fg transition-[border-color,transform] duration-200 hover:border-accent active:scale-[0.98]"
                  >
                    <ChatIcon className="h-[18px] w-[18px]" />
                    Message
                  </Link>
                  <Link
                    href={`/matches/${matchId}/book?application=${a.id}`}
                    className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] bg-accent text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98]"
                  >
                    {free ? "Choose" : "Book"}
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ApplicantStatus({ status }: { status: string }) {
  if (status === "accepted") return <BookedPill />;
  const map: Record<string, { label: string; tone: "success" | "accent" | "warning" | "neutral" }> = {
    pending: { label: "Waiting", tone: "warning" },
    rejected: { label: "Not chosen", tone: "neutral" },
    withdrawn: { label: "Withdrawn", tone: "neutral" },
  };
  const s = map[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}
