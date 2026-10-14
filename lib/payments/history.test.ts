import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TEAM_STATE,
  buildKeeperHistory,
  buildTeamHistory,
  groupByMonth,
  keeperCsv,
  keeperSummary,
  londonMonthKey,
  teamSummary,
  type HistoryBooking,
} from "./history.ts";

const NOW = new Date("2026-10-08T12:00:00Z");
const future = { starts_at: "2026-10-20T18:00:00Z", ends_at: "2026-10-20T19:00:00Z", address: "Hackney Marshes, London" };
const past = { starts_at: "2026-10-01T18:00:00Z", ends_at: "2026-10-01T19:00:00Z", address: "Victoria Park, London" };

// Tarifa de 30 libras, comision 15%: total 3450.
const booking = (over: Partial<HistoryBooking> = {}): HistoryBooking => ({
  id: "b1",
  match_id: "m1",
  status: "confirmed",
  payment_status: "held",
  rate_pence: 3000,
  platform_fee_pence: 450,
  total_pence: 3450,
  keeper_payout_pence: 3000,
  commission_pct: "15.00",
  cancellation_charge_pct: null,
  cancelled_by: null,
  cancelled_at: null,
  released_at: null,
  auto_release_at: null,
  keeper_checked_in_at: null,
  created_at: "2026-09-20T10:00:00Z",
  matches: future,
  ...over,
});

const team = (b: HistoryBooking) => buildTeamHistory([b], NOW)[0];
const keeper = (b: HistoryBooking, debt = 0, struck = false) =>
  buildKeeperHistory([b], new Map(debt ? [[b.id, debt]] : []), new Set(struck ? [b.id] : []), NOW)[0];

test("reserva por pagar o sin importes: no sale en el historial de ninguno", () => {
  assert.equal(buildTeamHistory([booking({ status: "pending_payment" })], NOW).length, 0);
  assert.equal(buildKeeperHistory([booking({ status: "pending_payment" })], new Map(), new Set(), NOW).length, 0);
  assert.equal(buildTeamHistory([booking({ rate_pence: null, total_pence: null })], NOW).length, 0);
});

test("equipo: pago retenido, desglose y estados segun el partido", () => {
  const held = team(booking());
  assert.equal(held.state, "held");
  assert.equal(TEAM_STATE[held.state].label, "Transfer pending");
  assert.deepEqual([held.ratePence, held.feePence, held.totalPence, held.costPence], [3000, 450, 3450, 3450]);
  assert.equal(held.refundStatus, "none");
  assert.equal(team(booking({ matches: past })).state, "awaiting_release");
  assert.equal(team(booking({ matches: past, status: "completed", payment_status: "released", released_at: "2026-10-02T00:00:00Z" })).state, "released");
  assert.equal(team(booking({ status: "under_review" })).state, "review");
  assert.equal(team(booking({ payment_status: "disputed" })).state, "dispute");
});

test("equipo cancela con mas de 24 h: reembolso total, coste 0", () => {
  const e = team(booking({ status: "cancelled", payment_status: "refunded", cancellation_charge_pct: 0, cancelled_by: "team" }));
  assert.equal(e.state, "cancelled_refunded");
  assert.equal(e.refundPence, 3450);
  assert.equal(e.costPence, 0);
  assert.equal(e.refundStatus, "done");
});

test("equipo cancela entre 24 h y 2 h: se queda con 1725 y el reembolso se ve aunque tarde dias", () => {
  const done = team(booking({ status: "cancelled", payment_status: "partially_refunded", cancellation_charge_pct: 50, cancelled_by: "team" }));
  assert.equal(done.state, "cancelled_partial");
  assert.deepEqual([done.refundPence, done.costPence, done.refundStatus], [1725, 1725, "done"]);
  const waiting = team(booking({ status: "cancelled", payment_status: "held", cancellation_charge_pct: 50, cancelled_by: "team" }));
  assert.equal(waiting.refundStatus, "on_its_way");
});

test("equipo cancela con menos de 2 h: sin reembolso", () => {
  const e = team(booking({ status: "cancelled", payment_status: "released", cancellation_charge_pct: 100, cancelled_by: "team" }));
  assert.equal(e.state, "cancelled_charged");
  assert.deepEqual([e.refundPence, e.costPence, e.refundStatus], [0, 3450, "none"]);
});

test("portero: su tarifa sin comision y sin el total que pago el equipo", () => {
  const e = keeper(booking());
  assert.equal(e.grossPence, 3000);
  const keys = Object.keys(e);
  for (const forbidden of ["feePence", "totalPence", "platformFeePence", "ratePence", "costPence", "refundPence"]) {
    assert.ok(!keys.includes(forbidden), `keeper entry must not expose ${forbidden}`);
  }
});

test("portero: pagado, con descuento por deuda", () => {
  const b = booking({ status: "completed", payment_status: "released", released_at: "2026-10-02T09:00:00Z", matches: past });
  const e = keeper(b, 1200);
  assert.deepEqual([e.state, e.paid, e.grossPence, e.debtPence, e.netPaidPence], ["released", true, 3000, 1200, 1800]);
  // La deuda nunca supera lo que cobra.
  assert.equal(keeper(b, 9000).netPaidPence, 0);
});

test("portero: jugado y sin liberar no cuenta como pagado", () => {
  const e = keeper(booking({ matches: past, keeper_checked_in_at: "2026-10-01T17:55:00Z" }));
  assert.deepEqual([e.state, e.paid, e.netPaidPence, e.checkedIn], ["awaiting_release", false, 0, true]);
});

test("portero: cancelaciones del equipo pagan su parte; las suyas, nada", () => {
  const half = keeper(booking({ status: "cancelled", payment_status: "partially_refunded", cancellation_charge_pct: 50, cancelled_by: "team", released_at: "2026-10-05T00:00:00Z" }));
  assert.deepEqual([half.state, half.grossPence, half.netPaidPence], ["cancelled_partial", 1500, 1500]);
  const full = keeper(booking({ status: "cancelled", payment_status: "released", cancellation_charge_pct: 100, cancelled_by: "team" }));
  assert.deepEqual([full.grossPence, full.paid], [3000, false]);
  const own = keeper(booking({ status: "cancelled", payment_status: "refunded", cancellation_charge_pct: 0, cancelled_by: "keeper" }), 0, true);
  assert.deepEqual([own.state, own.grossPence, own.paid, own.strike], ["cancelled_refunded", 0, false, true]);
});

test("portero: en disputa no se cuenta como pagado", () => {
  const e = keeper(booking({ status: "completed", payment_status: "disputed", released_at: "2026-10-02T09:00:00Z", matches: past }));
  assert.deepEqual([e.state, e.paid, e.netPaidPence], ["dispute", false, 0]);
});

test("resumen del equipo", () => {
  const entries = buildTeamHistory(
    [
      booking({ id: "a", status: "completed", payment_status: "released", released_at: "2026-10-02T00:00:00Z", matches: past }),
      booking({ id: "b", status: "cancelled", payment_status: "partially_refunded", cancellation_charge_pct: 50 }),
      booking({ id: "c" }),
    ],
    NOW,
  );
  const s = teamSummary(entries, NOW);
  assert.equal(s.spentPence, 3450 + 1725);
  assert.equal(s.spentThisMonthPence, 3450 + 1725);
  assert.equal(s.heldPence, 3450);
  assert.equal(s.refundedPence, 1725);
});

test("resumen del portero", () => {
  const entries = buildKeeperHistory(
    [
      booking({ id: "a", status: "completed", payment_status: "released", released_at: "2026-10-02T00:00:00Z", matches: past }),
      booking({ id: "b", status: "completed", payment_status: "released", released_at: "2026-09-02T00:00:00Z", matches: { ...past, starts_at: "2026-09-01T18:00:00Z", ends_at: "2026-09-01T19:00:00Z" } }),
      booking({ id: "c" }),
      booking({ id: "d", matches: past }),
      booking({ id: "e", status: "under_review", matches: past }),
    ],
    new Map([["a", 500]]),
    new Set(),
    NOW,
  );
  const s = keeperSummary(entries, NOW);
  assert.equal(s.paidPence, 2500 + 3000);
  assert.equal(s.paidThisMonthPence, 2500);
  assert.equal(s.bookedPence, 3000);
  assert.equal(s.pendingPence, 3000);
  assert.equal(s.reviewPence, 3000);
  assert.equal(s.debtTakenPence, 500);
});

test("el mes se cuenta en hora de Londres y se agrupa", () => {
  assert.equal(londonMonthKey("2026-06-30T23:30:00Z"), "2026-07");
  assert.equal(londonMonthKey("2026-12-31T23:30:00Z"), "2026-12");
  const entries = buildTeamHistory(
    [booking({ id: "x", matches: future }), booking({ id: "y", matches: past }), booking({ id: "z", matches: { ...past, starts_at: "2026-09-10T18:00:00Z", ends_at: "2026-09-10T19:00:00Z" } })],
    NOW,
  );
  const groups = groupByMonth(entries);
  assert.deepEqual(groups.map((g) => [g.monthKey, g.items.length]), [["2026-10", 2], ["2026-09", 1]]);
  assert.equal(entries[0].bookingId, "x");
});

test("CSV: cabecera, importes y proteccion contra formulas y comas", () => {
  const entry = keeper(booking({ status: "completed", payment_status: "released", released_at: "2026-10-02T09:00:00Z", matches: { ...past, address: '=HYPERLINK("x"), Park' } }), 500);
  const csv = keeperCsv([{ entry, team: "+Team, Name", statusLabel: "Paid" }]);
  const [header, row] = csv.split("\r\n");
  assert.ok(header.startsWith("Match date,Pitch,Team,Status"));
  assert.equal(row, `2026-10-01,"'=HYPERLINK(""x""), Park","'+Team, Name",Paid,30.00,5.00,25.00,2026-10-02`);
  assert.ok(csv.endsWith("\r\n"));
});
