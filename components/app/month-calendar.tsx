"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from "@/components/platform/icons";
import type { CalEvent, CalKind } from "@/lib/data/calendar";
import { addDays, clockTime, longDate, mondayIndex, timeRange, todayLondon } from "@/lib/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHIP: Record<CalKind, string> = {
  booked: "bg-accent text-accent-ink",
  open: "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-warning",
  waiting: "border border-line-strong text-fg-2",
  played: "bg-surface-2 text-fg-2",
};
const DOT: Record<CalKind, string> = {
  booked: "bg-accent",
  open: "bg-warning",
  waiting: "border border-fg-2 bg-transparent",
  played: "bg-muted",
};
const LABEL: Record<CalKind, string> = {
  booked: "Booked",
  open: "Looking for a keeper",
  waiting: "Waiting for a reply",
  played: "Played",
};

const monthLabel = (y: number, m: number) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));

const pad = (n: number) => String(n).padStart(2, "0");

export function MonthCalendar({ events, isKeeper }: { events: CalEvent[]; isKeeper: boolean }) {
  const [today] = useState(todayLondon);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = todayLondon().split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
      map.set(e.day, [...(map.get(e.day) ?? []), e]);
    }
    return map;
  }, [events]);

  const first = `${cursor.y}-${pad(cursor.m + 1)}-01`;
  const offset = mondayIndex(first);
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(first, i - offset));

  const goto = (y: number, m: number) => {
    const d = new Date(Date.UTC(y, m, 1));
    setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const pick = (day: string) => {
    setSelected(day);
    const [y, m] = day.split("-").map(Number);
    if (y !== cursor.y || m - 1 !== cursor.m) setCursor({ y, m: m - 1 });
  };

  const dayEvents = byDay.get(selected) ?? [];
  const legend: CalKind[] = isKeeper ? ["booked", "waiting", "played"] : ["booked", "open", "played"];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
      <section aria-label="Month" className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="pl-display text-fg [font-size:var(--t-xl)]" aria-live="polite">
            {monthLabel(cursor.y, cursor.m)}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const [y, m] = today.split("-").map(Number);
                setCursor({ y, m: m - 1 });
                setSelected(today);
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goto(cursor.y, cursor.m - 1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goto(cursor.y, cursor.m + 1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="pl-surface overflow-hidden rounded-[var(--r-xl)] p-1.5 sm:p-2">
          <div className="grid grid-cols-7 pb-1.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:text-[11px]">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1.5">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-[var(--r-lg)] bg-line">
            {cells.map((day) => {
              const inMonth = day.startsWith(`${cursor.y}-${pad(cursor.m + 1)}`);
              const list = byDay.get(day) ?? [];
              const isToday = day === today;
              const isSel = day === selected;
              const num = Number(day.slice(8));
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  aria-pressed={isSel}
                  aria-label={`${longDate(`${day}T12:00:00Z`)}${list.length ? `, ${list.length} ${list.length === 1 ? "match" : "matches"}` : ""}`}
                  className={`flex min-h-[3.5rem] flex-col items-center gap-1 bg-bg-2 p-1.5 text-left transition-colors duration-150 hover:bg-bg-3 md:min-h-28 md:items-stretch md:p-2 ${
                    isSel ? "!bg-accent-soft" : ""
                  } ${inMonth ? "" : "opacity-45"}`}
                >
                  <span
                    className={`pl-tnum grid h-7 w-7 place-items-center rounded-full text-sm font-semibold md:self-start ${
                      isToday ? "bg-accent text-accent-ink" : isSel ? "text-accent-strong" : "text-fg-2"
                    }`}
                  >
                    {num}
                  </span>

                  <span className="flex gap-1 md:hidden" aria-hidden>
                    {list.slice(0, 3).map((e) => (
                      <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${DOT[e.kind]}`} />
                    ))}
                  </span>

                  <span className="hidden min-w-0 flex-col gap-1 md:flex" aria-hidden>
                    {list.slice(0, 2).map((e) => (
                      <span key={e.id} className={`truncate rounded-[var(--r-xs)] px-1.5 py-0.5 text-[11px] font-medium ${CHIP[e.kind]}`}>
                        {clockTime(e.startsAt)} {e.address}
                      </span>
                    ))}
                    {list.length > 2 && <span className="px-1 text-[11px] font-medium text-muted">+{list.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label="Legend">
          {legend.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${DOT[k]}`} />
              {LABEL[k]}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Selected day" className="min-w-0 xl:sticky xl:top-10 xl:self-start">
        <p className="pl-eyebrow">{selected === today ? "Today" : "Selected day"}</p>
        <h2 className="pl-display mt-2 text-fg [font-size:var(--t-xl)]">{longDate(`${selected}T12:00:00Z`)}</h2>

        {dayEvents.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarIcon}
              title="Nothing on this day"
              body={isKeeper ? "Matches you apply to or are booked for show up here." : "No matches posted for this day."}
              action={
                !isKeeper && selected >= today ? (
                  <Link
                    href={`/matches/new?date=${selected}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-strong underline underline-offset-4"
                  >
                    Post a match for this day
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/matches/${e.matchId}`}
                  className="pl-surface pl-lift block rounded-[var(--r-lg)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="pl-tnum text-sm font-semibold text-fg">{timeRange(e.startsAt, e.endsAt)}</p>
                    <span className={`rounded-[var(--r-xs)] px-2 py-1 text-xs font-semibold ${CHIP[e.kind]}`}>{LABEL[e.kind]}</span>
                  </div>
                  <p className="mt-2 truncate text-[15px] font-medium text-fg">{e.address}</p>
                  <p className="mt-0.5 text-sm text-muted">{e.sub}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
