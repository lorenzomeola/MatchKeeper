import { monthYear } from "./format.ts";

const BOOKING_STATUS = {
  confirmed: { label: "Booked", tone: "accent" },
  completed: { label: "Played", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  under_review: { label: "Under review", tone: "warning" },
  pending_payment: { label: "Awaiting payment", tone: "warning" },
} as const;

/** Publicado después de la última visita. Sin visita previa, todo cuenta como nuevo. */
export function isNewSince(createdAt: string | null | undefined, seenAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  return !seenAt || Date.parse(createdAt) > Date.parse(seenAt);
}

export function bookingListStatus(status: string | null) {
  return status !== null && Object.hasOwn(BOOKING_STATUS, status)
    ? BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]
    : null;
}

export function matchListStatus(matchStatus: string, bookingStatuses: readonly string[]) {
  if (matchStatus === "cancelled") return BOOKING_STATUS.cancelled;
  if (matchStatus === "completed") return BOOKING_STATUS.completed;
  if (bookingStatuses.includes("under_review")) return BOOKING_STATUS.under_review;
  if (matchStatus === "open") return { label: "Open", tone: "success" } as const;
  return BOOKING_STATUS.confirmed;
}

export function keeperMatchTab(input: { applicationStatus: string; matchStatus: string; bookingStatus: string | null; ended: boolean }) {
  if (
    input.ended || ["completed", "cancelled"].includes(input.matchStatus) ||
    ["completed", "cancelled", "under_review"].includes(input.bookingStatus ?? "") ||
    ["rejected", "withdrawn"].includes(input.applicationStatus)
  ) return "past";
  if (input.applicationStatus === "pending" && input.matchStatus === "open") return "open";
  return input.applicationStatus === "accepted" ? "booked" : "past";
}

export type AdminMatchTab = "upcoming" | "past" | "cancelled" | "all";
export const ADMIN_MATCH_TABS: readonly AdminMatchTab[] = ["upcoming", "past", "cancelled", "all"];

/** Estado de un partido para el admin: un partido que ya terminó sin portero no sigue "abierto". */
export function adminMatchStatus(status: string, endsAt: string, now: Date) {
  const past = Date.parse(endsAt) < now.getTime();
  if (status === "cancelled") return { label: "Cancelled", tone: "danger", past } as const;
  if (status === "completed") return { label: "Played", tone: "neutral", past } as const;
  if (past) return status === "assigned" ? ({ label: "Played", tone: "neutral", past } as const) : ({ label: "No keeper", tone: "warning", past } as const);
  return status === "assigned" ? ({ label: "Booked", tone: "accent", past } as const) : ({ label: "Needs a keeper", tone: "success", past } as const);
}

/** Partidos seguidos agrupados por mes y año de Londres, en el orden en que llegan. */
export function groupByMonth<T extends { starts_at: string }>(rows: T[]): { label: string; rows: T[] }[] {
  const groups: { label: string; rows: T[] }[] = [];
  for (const r of rows) {
    const label = monthYear(r.starts_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }
  return groups;
}
