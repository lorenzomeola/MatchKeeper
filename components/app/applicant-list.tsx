"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { StatusBadge } from "@/components/app/status-badge";
import { ChatIcon } from "@/components/platform/icons";
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
};

const SORTS = [
  { value: "rate", label: "Lowest rate" },
  { value: "experience", label: "Most experience" },
  { value: "recent", label: "Newest first" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export function ApplicantList({ matchId, applicants, minutes }: { matchId: string; applicants: Applicant[]; minutes: number }) {
  const [sort, setSort] = useState<Sort>("rate");

  const sorted = [...applicants].sort((a, b) => {
    if (sort === "experience") return (b.experienceYears ?? -1) - (a.experienceYears ?? -1) || a.rate - b.rate;
    if (sort === "recent") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return a.rate - b.rate;
  });
  const lowest = Math.min(...applicants.map((a) => a.rate));

  return (
    <div>
      {applicants.length > 1 && (
        <label className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{applicants.length} keepers applied</span>
          <span className="flex items-center gap-2">
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
          </span>
        </label>
      )}

      <ul className="grid grid-cols-1 gap-3">
        {sorted.map((a) => (
          <li key={a.id} className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <Link href={`/keepers/${a.keeperId}`} aria-label={`${a.name}'s profile`} className="shrink-0">
                <Avatar name={a.name} src={a.avatarUrl} size="lg" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/keepers/${a.keeperId}`} className="group min-w-0">
                    <p className="truncate text-base font-semibold text-fg group-hover:text-accent-strong">{a.name}</p>
                    <p className="text-[13px] text-muted">{a.city ?? "London"} · View profile</p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="pl-display pl-tnum text-fg [font-size:var(--t-2xl)]">{money(a.rate)}</p>
                    {isDuration(minutes) && <p className="text-xs text-muted">for {durationText(minutes)}</p>}
                    {applicants.length > 1 && a.rate === lowest && (
                      <span className="text-xs font-semibold text-success">Lowest rate</span>
                    )}
                  </div>
                </div>

                {(a.experienceYears != null || a.level || a.ageRange) && (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {a.ageRange && (
                    <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">Age {a.ageRange}</li>
                  )}
                  {a.experienceYears != null && (
                    <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
                      {a.experienceYears} {a.experienceYears === 1 ? "year" : "years"} as a keeper
                    </li>
                  )}
                  {a.level && (
                    <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">{a.level}</li>
                  )}
                </ul>
                )}
              </div>
            </div>

            {a.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{a.bio}</p>}
            {a.message && (
              <p className="mt-3 rounded-[var(--r-md)] bg-surface px-3 py-2.5 text-sm leading-snug text-fg-2">
                <span className="mb-0.5 block text-xs font-medium text-muted">Their message</span>
                {a.message}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                href={`/messages/${a.id}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] border border-line-strong text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent active:scale-[0.98]"
              >
                <ChatIcon className="h-[18px] w-[18px]" />
                Message
              </Link>
              <Link
                href={`/matches/${matchId}/book?application=${a.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98]"
              >
                Book
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ApplicantStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "success" | "accent" | "warning" | "neutral" }> = {
    accepted: { label: "Booked", tone: "accent" },
    pending: { label: "Waiting", tone: "warning" },
    rejected: { label: "Not chosen", tone: "neutral" },
    withdrawn: { label: "Withdrawn", tone: "neutral" },
  };
  const s = map[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}
