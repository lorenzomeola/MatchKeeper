import assert from "node:assert/strict";
import { test } from "node:test";
import { disputeRatioPct, dueState, evidenceSubmitBlock, retransferAmount, reversibleAmount } from "./disputes.ts";
import { FIELD_MAX, evidenceChecks, formatEvidence, type EvidenceInput } from "./dispute-evidence.ts";

const NOW = new Date("2026-10-06T12:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

test("fecha límite: sin fecha, de sobra, urgente (menos de 72 h) y vencida", () => {
  assert.equal(dueState(null, NOW), "none");
  assert.equal(dueState(hours(200), NOW), "ok");
  assert.equal(dueState(hours(71), NOW), "urgent");
  assert.equal(dueState(hours(-1), NOW), "overdue");
  assert.equal(dueState(NOW, NOW), "overdue");
});

test("lo revertible nunca es negativo", () => {
  assert.equal(reversibleAmount(3000, 0), 3000);
  assert.equal(reversibleAmount(3000, 1000), 2000);
  assert.equal(reversibleAmount(3000, 3000), 0);
  assert.equal(reversibleAmount(3000, 4000), 0);
});

test("disputa ganada: se devuelve lo revertido más lo ya descontado de otros pagos", () => {
  assert.equal(retransferAmount({ reversedPence: 3000, debtRecoveredPence: 0 }), 3000);
  assert.equal(retransferAmount({ reversedPence: 0, debtRecoveredPence: 1200 }), 1200);
  assert.equal(retransferAmount({ reversedPence: 0, debtRecoveredPence: 0 }), 0);
  assert.equal(retransferAmount({ reversedPence: -5, debtRecoveredPence: 100 }), 100);
});

test("ratio de disputas", () => {
  assert.equal(disputeRatioPct(0, 0), 0);
  assert.equal(disputeRatioPct(1, 200), 0.5);
  assert.equal(disputeRatioPct(1, 3), 33.33);
});

test("enviar evidencia: solo si se puede responder, a tiempo, y no enviada ya", () => {
  const base = { status: "needs_response", dueBy: hours(48), submittedAt: null, hasEvidence: true, now: NOW };
  assert.equal(evidenceSubmitBlock(base), null);
  assert.ok(evidenceSubmitBlock({ ...base, status: "under_review" }));
  assert.ok(evidenceSubmitBlock({ ...base, status: "won" }));
  assert.ok(evidenceSubmitBlock({ ...base, submittedAt: hours(-1) }));
  assert.ok(evidenceSubmitBlock({ ...base, hasEvidence: false }));
  assert.ok(evidenceSubmitBlock({ ...base, dueBy: hours(-2) }));
  assert.equal(evidenceSubmitBlock({ ...base, dueBy: null }), null);
});

const input = (over: Partial<EvidenceInput> = {}): EvidenceInput => ({
  bookingId: "b1",
  matchAddress: "Hackney Marshes, E9 5EF",
  startsAt: new Date("2026-10-01T11:00:00Z"),
  endsAt: new Date("2026-10-01T12:00:00Z"),
  playerName: "Sam Team",
  playerEmail: "sam@example.com",
  keeperName: "Kay Keeper",
  keeperExperienceYears: 6,
  ratePence: 3000,
  totalPence: 3450,
  termsVersion: "2026-10-06",
  termsAcceptedAt: new Date("2026-09-28T09:00:00Z"),
  paidAt: new Date("2026-09-28T09:02:00Z"),
  checkedInAt: new Date("2026-10-01T10:50:00Z"),
  checkInDistanceM: 35,
  teamResponse: "confirmed",
  teamRespondedAt: new Date("2026-10-01T12:30:00Z"),
  teamReportNote: null,
  chat: [{ at: new Date("2026-09-29T10:00:00Z"), from: "team", body: "See you at the north gate" }],
  events: [{ at: new Date("2026-10-01T12:30:05Z"), type: "released" }],
  ...over,
});

test("evidencia completa: campos de Stripe con fecha, línea de tiempo ordenada y chat", () => {
  const e = formatEvidence(input());
  assert.equal(e.stripe.customer_name, "Sam Team");
  assert.equal(e.stripe.customer_email_address, "sam@example.com");
  assert.equal(e.stripe.service_date, "2026-10-01");
  assert.match(e.stripe.access_activity_log, /checked in/);
  assert.match(e.stripe.access_activity_log, /3D Secure/);
  assert.match(e.stripe.uncategorized_text, /See you at the north gate/);
  assert.match(e.stripe.cancellation_policy_disclosure, /24 hours/);
  const lines = e.stripe.access_activity_log.split("\n");
  assert.deepEqual(lines, [...lines].sort());
  assert.ok(e.checks.every((c) => c.ok));
});

test("sin check-in ni confirmación: las pruebas lo reflejan y no se inventa nada", () => {
  const i = input({ checkedInAt: null, checkInDistanceM: null, teamResponse: "reported_no_show", chat: [], termsAcceptedAt: null });
  const e = formatEvidence(i);
  assert.doesNotMatch(e.stripe.access_activity_log, /checked in/);
  assert.match(e.stripe.uncategorized_text, /No messages were exchanged/);
  assert.equal(evidenceChecks(i).filter((c) => c.ok).length, 0);
});

test("sin email del equipo no se envía el campo", () => {
  assert.equal("customer_email_address" in formatEvidence(input({ playerEmail: null })).stripe, false);
});

test("un chat enorme se recorta por debajo del límite de Stripe", () => {
  const chat = Array.from({ length: 2000 }, (_, n) => ({ at: new Date(NOW.getTime() + n), from: "team" as const, body: "x".repeat(50) }));
  const e = formatEvidence(input({ chat }));
  assert.ok(e.stripe.uncategorized_text.length <= FIELD_MAX);
  assert.match(e.stripe.uncategorized_text, /truncated/);
});
