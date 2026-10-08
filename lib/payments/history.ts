// Historial de pagos del equipo y del portero (PAYMENTS_SPEC.md 12.1). Todo en peniques y sin dependencias,
// para probarlo con `npm test`. Cada lado recibe solo sus cifras: el portero no ve la comisión ni lo que pagó el equipo.
import { partialCharge } from "./money.ts";

export type HistoryState =
  | "held"
  | "awaiting_release"
  | "released"
  | "review"
  | "dispute"
  | "cancelled_refunded"
  | "cancelled_partial"
  | "cancelled_charged";

export type HistoryBooking = {
  id: string;
  match_id: string;
  status: string;
  payment_status: string;
  rate_pence: number | null;
  platform_fee_pence: number | null;
  total_pence: number | null;
  keeper_payout_pence: number | null;
  commission_pct: string | number;
  cancellation_charge_pct: number | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  released_at: string | null;
  auto_release_at: string | null;
  keeper_checked_in_at: string | null;
  created_at: string;
  matches: { starts_at: string; ends_at: string; address: string | null } | null;
};

type Base = {
  bookingId: string;
  matchId: string;
  state: HistoryState;
  /** Fecha del partido; si no se puede leer, la de la cancelación o la de la reserva. */
  at: string;
  /** yyyy-mm en hora de Londres. */
  monthKey: string;
  startsAt: string | null;
  address: string | null;
  cancelledBy: string | null;
  releasedAt: string | null;
};

export type TeamEntry = Base & {
  ratePence: number;
  feePence: number;
  totalPence: number;
  /** Lo que se devuelve (o ya se devolvió) al equipo. */
  refundPence: number;
  refundStatus: "none" | "on_its_way" | "done";
  /** Lo que el equipo acaba pagando: lo cobrado menos el reembolso. */
  costPence: number;
};

export type KeeperEntry = Base & {
  /** Su tarifa, o la parte que cobra si el equipo canceló tarde. */
  grossPence: number;
  /** Descontado por una deuda (disputa perdida). */
  debtPence: number;
  /** Lo transferido a su cuenta de Stripe; 0 mientras no se haya pagado. */
  netPaidPence: number;
  paid: boolean;
  checkedIn: boolean;
  autoReleaseAt: string | null;
  /** Esta cancelación le costó un strike vigente. */
  strike: boolean;
};

const TZ = "Europe/London";

export function londonMonthKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)).slice(0, 7);
}

function cancelPct(b: HistoryBooking) {
  return b.cancellation_charge_pct ?? 0;
}

export function stateOf(b: HistoryBooking, now: Date): HistoryState | null {
  if (b.status === "pending_payment") return null;
  if (b.payment_status === "disputed") return "dispute";
  if (b.status === "cancelled") {
    const pct = cancelPct(b);
    return pct === 0 ? "cancelled_refunded" : pct >= 100 ? "cancelled_charged" : "cancelled_partial";
  }
  if (b.status === "under_review") return "review";
  if (b.status === "completed") return "released";
  const ended = b.matches ? now.getTime() >= Date.parse(b.matches.ends_at) : false;
  return ended ? "awaiting_release" : "held";
}

function baseOf(b: HistoryBooking, state: HistoryState): Base {
  const at = b.matches?.starts_at ?? b.cancelled_at ?? b.created_at;
  return {
    bookingId: b.id,
    matchId: b.match_id,
    state,
    at,
    monthKey: londonMonthKey(at),
    startsAt: b.matches?.starts_at ?? null,
    address: b.matches?.address ?? null,
    cancelledBy: b.cancelled_by,
    releasedAt: b.released_at,
  };
}

/** Reservas sin importes (anteriores a los pagos) no se muestran. */
export function teamEntry(b: HistoryBooking, now: Date): TeamEntry | null {
  const state = stateOf(b, now);
  if (!state || b.rate_pence == null || b.total_pence == null) return null;
  const isCancelled = b.status === "cancelled";
  const split = partialCharge(b.rate_pence, Number(b.commission_pct), isCancelled ? cancelPct(b) : 100);
  const refundPence = isCancelled ? split.refundPence : 0;
  const refundDone = b.payment_status === "refunded" || b.payment_status === "partially_refunded";
  return {
    ...baseOf(b, state),
    ratePence: b.rate_pence,
    feePence: b.platform_fee_pence ?? b.total_pence - b.rate_pence,
    totalPence: b.total_pence,
    refundPence,
    refundStatus: refundPence === 0 ? "none" : refundDone ? "done" : "on_its_way",
    costPence: b.total_pence - refundPence,
  };
}

export function keeperEntry(b: HistoryBooking, debtPence: number, strike: boolean, now: Date): KeeperEntry | null {
  const state = stateOf(b, now);
  if (!state || b.rate_pence == null) return null;
  const isCancelled = b.status === "cancelled";
  const grossPence = isCancelled
    ? partialCharge(b.rate_pence, Number(b.commission_pct), cancelPct(b)).keeperSharePence
    : (b.keeper_payout_pence ?? b.rate_pence);
  const paid = b.released_at != null && grossPence > 0 && state !== "dispute";
  const debt = paid ? Math.min(debtPence, grossPence) : 0;
  return {
    ...baseOf(b, state),
    grossPence,
    debtPence: debt,
    netPaidPence: paid ? grossPence - debt : 0,
    paid,
    checkedIn: b.keeper_checked_in_at != null,
    autoReleaseAt: b.auto_release_at,
    strike,
  };
}

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

// Mismo estado, palabras distintas según quién lo lee.
export const TEAM_STATE: Record<HistoryState, { label: string; tone: Tone }> = {
  held: { label: "Held until the match", tone: "accent" },
  awaiting_release: { label: "Played, not released yet", tone: "accent" },
  released: { label: "Paid to the keeper", tone: "success" },
  review: { label: "Under review", tone: "warning" },
  dispute: { label: "In dispute", tone: "danger" },
  cancelled_refunded: { label: "Refunded", tone: "neutral" },
  cancelled_partial: { label: "Partly refunded", tone: "neutral" },
  cancelled_charged: { label: "Cancelled, no refund", tone: "neutral" },
};

export const KEEPER_STATE: Record<HistoryState, { label: string; tone: Tone }> = {
  held: { label: "Booked", tone: "accent" },
  awaiting_release: { label: "Played, payment due", tone: "accent" },
  released: { label: "Paid", tone: "success" },
  review: { label: "Under review", tone: "warning" },
  dispute: { label: "In dispute", tone: "danger" },
  cancelled_refunded: { label: "Cancelled, no payment", tone: "neutral" },
  cancelled_partial: { label: "Cancelled, part paid", tone: "neutral" },
  cancelled_charged: { label: "Cancelled, paid in full", tone: "neutral" },
};

const byDateDesc = (a: { at: string }, b: { at: string }) => Date.parse(b.at) - Date.parse(a.at);

export function buildTeamHistory(rows: HistoryBooking[], now: Date): TeamEntry[] {
  return rows.flatMap((b) => teamEntry(b, now) ?? []).sort(byDateDesc);
}

export function buildKeeperHistory(
  rows: HistoryBooking[],
  debtByBooking: Map<string, number>,
  struckBookings: Set<string>,
  now: Date,
): KeeperEntry[] {
  return rows
    .flatMap((b) => keeperEntry(b, debtByBooking.get(b.id) ?? 0, struckBookings.has(b.id), now) ?? [])
    .sort(byDateDesc);
}

const sum = <T>(items: T[], pick: (t: T) => number) => items.reduce((s, i) => s + pick(i), 0);
const SETTLED: HistoryState[] = ["released", "cancelled_refunded", "cancelled_partial", "cancelled_charged"];

/** El dinero ya no se mueve más: jugado y pagado, o cancelado. */
export const isSettled = (e: { state: HistoryState }) => SETTLED.includes(e.state);

export function teamSummary(entries: TeamEntry[], now: Date) {
  const month = londonMonthKey(now.toISOString());
  const settled = entries.filter(isSettled);
  const held = entries.filter((e) => ["held", "awaiting_release", "review", "dispute"].includes(e.state));
  return {
    spentPence: sum(settled, (e) => e.costPence),
    spentThisMonthPence: sum(
      settled.filter((e) => e.monthKey === month),
      (e) => e.costPence,
    ),
    heldPence: sum(held, (e) => e.totalPence),
    refundedPence: sum(entries, (e) => e.refundPence),
  };
}

export function keeperSummary(entries: KeeperEntry[], now: Date) {
  const month = londonMonthKey(now.toISOString());
  const paid = entries.filter((e) => e.paid);
  const unpaidShare = (e: KeeperEntry) => !e.paid && e.grossPence > 0;
  return {
    paidPence: sum(paid, (e) => e.netPaidPence),
    paidThisMonthPence: sum(
      paid.filter((e) => e.releasedAt && londonMonthKey(e.releasedAt) === month),
      (e) => e.netPaidPence,
    ),
    bookedPence: sum(
      entries.filter((e) => e.state === "held"),
      (e) => e.grossPence,
    ),
    // Jugados (o cancelados con parte para el portero) y todavía sin transferir.
    pendingPence: sum(
      entries.filter((e) => ["awaiting_release", "cancelled_partial", "cancelled_charged"].includes(e.state) && unpaidShare(e)),
      (e) => e.grossPence,
    ),
    reviewPence: sum(
      entries.filter((e) => e.state === "review"),
      (e) => e.grossPence,
    ),
    disputePence: sum(
      entries.filter((e) => e.state === "dispute"),
      (e) => e.grossPence,
    ),
    debtTakenPence: sum(entries, (e) => e.debtPence),
  };
}

export function groupByMonth<T extends { monthKey: string }>(entries: T[]) {
  const groups = new Map<string, T[]>();
  for (const e of entries) groups.set(e.monthKey, [...(groups.get(e.monthKey) ?? []), e]);
  return [...groups.entries()].map(([monthKey, items]) => ({ monthKey, items }));
}

// --- Exportación CSV del portero ---

// Un campo que empieza por = + - @ lo ejecutaría Excel como fórmula: se antepone una comilla.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pounds = (pence: number) => (pence / 100).toFixed(2);

export const KEEPER_CSV_HEADER = [
  "Match date",
  "Pitch",
  "Team",
  "Status",
  "Your rate (GBP)",
  "Repaid for a dispute (GBP)",
  "Sent to your Stripe account (GBP)",
  "Sent on",
];

export function keeperCsv(
  rows: { entry: KeeperEntry; team: string; statusLabel: string }[],
): string {
  const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)) : "");
  const lines = [KEEPER_CSV_HEADER, ...rows.map(({ entry: e, team, statusLabel }) => [
    day(e.startsAt ?? e.at),
    e.address ?? "",
    team,
    statusLabel,
    pounds(e.grossPence),
    pounds(e.debtPence),
    pounds(e.netPaidPence),
    day(e.paid ? e.releasedAt : null),
  ])];
  return lines.map((cols) => cols.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
