import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTotals, cancellationOutcome, hoursBeforeStart, partialCharge } from "./money.ts";
import { decideRelease } from "./release.ts";
import { deriveKeeperPaymentState } from "./connect-status.ts";
import { checkInAllowed, distanceMeters, teamCanRespond } from "./checkin.ts";

const pitch = { lat: 51.55186667, lng: -0.02562255 };

test("distancia: mismo punto es 0 y 0.0009 grados de latitud son unos 100 m", () => {
  assert.equal(distanceMeters(pitch, pitch), 0);
  const d = distanceMeters(pitch, { lat: pitch.lat + 0.0009, lng: pitch.lng });
  assert.ok(d > 95 && d < 105, `distancia inesperada: ${d}`);
});

test("check-in: ventana de 30 min antes a 30 min despues del inicio", () => {
  const startsAt = new Date("2026-10-20T18:00:00Z");
  const at = (offsetMin: number) => new Date(startsAt.getTime() + offsetMin * 60_000);
  const base = { startsAt, distanceM: 50, windowMin: 30, radiusM: 200 };
  assert.deepEqual(checkInAllowed({ ...base, now: at(-31) }), { ok: false, reason: "too_early" });
  assert.deepEqual(checkInAllowed({ ...base, now: at(-30) }), { ok: true });
  assert.deepEqual(checkInAllowed({ ...base, now: at(0) }), { ok: true });
  assert.deepEqual(checkInAllowed({ ...base, now: at(30) }), { ok: true });
  assert.deepEqual(checkInAllowed({ ...base, now: at(31) }), { ok: false, reason: "too_late" });
});

test("check-in: rechaza a mas de 200 m del campo", () => {
  const startsAt = new Date("2026-10-20T18:00:00Z");
  const base = { now: startsAt, startsAt, windowMin: 30, radiusM: 200 };
  assert.deepEqual(checkInAllowed({ ...base, distanceM: 200 }), { ok: true });
  assert.deepEqual(checkInAllowed({ ...base, distanceM: 201 }), { ok: false, reason: "too_far" });
});

test("el equipo responde desde el inicio hasta la liberacion automatica", () => {
  const startsAt = new Date("2026-10-20T18:00:00Z");
  const autoReleaseAt = new Date("2026-10-23T19:00:00Z");
  assert.equal(teamCanRespond(new Date("2026-10-20T17:59:59Z"), startsAt, autoReleaseAt), false);
  assert.equal(teamCanRespond(startsAt, startsAt, autoReleaseAt), true);
  assert.equal(teamCanRespond(new Date("2026-10-23T18:59:59Z"), startsAt, autoReleaseAt), true);
  assert.equal(teamCanRespond(autoReleaseAt, startsAt, autoReleaseAt), false);
});

test("portero listo solo si las transferencias están activas y la retirada no está bloqueada", () => {
  assert.equal(deriveKeeperPaymentState({ transfersStatus: "active", payoutsStatus: "active" }).payoutsEnabled, true);
  assert.equal(deriveKeeperPaymentState({ transfersStatus: "active" }).payoutsEnabled, true);
  assert.equal(deriveKeeperPaymentState({ transfersStatus: "active", payoutsStatus: "restricted" }).payoutsEnabled, false);
  assert.equal(deriveKeeperPaymentState({ transfersStatus: "pending", payoutsStatus: "active" }).payoutsEnabled, false);
  assert.equal(deriveKeeperPaymentState({}).payoutsEnabled, false);
});

test("alta completa solo con cero requisitos pendientes conocidos", () => {
  assert.equal(deriveKeeperPaymentState({ outstandingRequirements: 0 }).onboardingComplete, true);
  assert.equal(deriveKeeperPaymentState({ outstandingRequirements: 2 }).onboardingComplete, false);
  assert.equal(deriveKeeperPaymentState({}).onboardingComplete, false);
});

test("totales: 30 libras con 15% -> 3450, comisión 450", () => {
  assert.deepEqual(calculateTotals(3000, 15), {
    ratePence: 3000,
    platformFeePence: 450,
    totalPence: 3450,
  });
});

test("totales: redondea la comisión al penique", () => {
  // 1005 * 15% = 150.75 -> 151
  assert.equal(calculateTotals(1005, 15).platformFeePence, 151);
});

test("totales: rechaza importes no enteros o negativos", () => {
  assert.throws(() => calculateTotals(30.5, 15), RangeError);
  assert.throws(() => calculateTotals(-1, 15), RangeError);
});

test("la suma de tarifa + comisión siempre es el total, para muchas tarifas", () => {
  for (let rate = 0; rate <= 20000; rate += 7) {
    const t = calculateTotals(rate, 15);
    assert.equal(t.ratePence + t.platformFeePence, t.totalPence);
  }
});

test("equipo cancela con más de 24 h: gratis, reembolso total", () => {
  const o = cancellationOutcome(3000, 15, "team", 48);
  assert.equal(o.chargePct, 0);
  assert.equal(o.chargedPence, 0);
  assert.equal(o.refundPence, 3450);
  assert.equal(o.strike, false);
});

test("equipo cancela entre 24 h y 2 h: cobra el 50%", () => {
  const o = cancellationOutcome(3000, 15, "team", 12);
  assert.equal(o.chargePct, 50);
  assert.equal(o.keeperSharePence, 1500);
  assert.equal(o.feeSharePence, 225);
  assert.equal(o.chargedPence, 1725);
  assert.equal(o.refundPence, 1725);
});

test("equipo cancela con menos de 2 h o después del inicio: cobra el 100%", () => {
  for (const hours of [1.9, 0, -3]) {
    const o = cancellationOutcome(3000, 15, "team", hours);
    assert.equal(o.chargePct, 100);
    assert.equal(o.chargedPence, 3450);
    assert.equal(o.refundPence, 0);
  }
});

test("límites exactos: 24 h cuenta como 50%, 2 h cuenta como 100%", () => {
  assert.equal(cancellationOutcome(3000, 15, "team", 24).chargePct, 50);
  assert.equal(cancellationOutcome(3000, 15, "team", 24.01).chargePct, 0);
  assert.equal(cancellationOutcome(3000, 15, "team", 2).chargePct, 100);
  assert.equal(cancellationOutcome(3000, 15, "team", 2.01).chargePct, 50);
});

test("portero cancela con más de 24 h: reembolso total, sin strike", () => {
  const o = cancellationOutcome(3000, 15, "keeper", 30);
  assert.equal(o.refundPence, 3450);
  assert.equal(o.chargedPence, 0);
  assert.equal(o.strike, false);
});

test("portero cancela con 24 h o menos: reembolso total y strike", () => {
  for (const hours of [24, 5, -1]) {
    const o = cancellationOutcome(3000, 15, "keeper", hours);
    assert.equal(o.refundPence, 3450);
    assert.equal(o.strike, true);
  }
});

test("cobrado + reembolsado siempre suma el total", () => {
  for (let rate = 100; rate <= 20000; rate += 13) {
    for (const hours of [100, 10, 1]) {
      const { totalPence } = calculateTotals(rate, 15);
      const o = cancellationOutcome(rate, 15, "team", hours);
      assert.equal(o.chargedPence + o.refundPence, totalPence);
      assert.ok(o.refundPence >= 0);
    }
  }
});

test("partialCharge con 100% equivale al total", () => {
  const p = partialCharge(3000, 15, 100);
  assert.equal(p.chargedPence, 3450);
  assert.equal(p.refundPence, 0);
});

test("hoursBeforeStart usa marcas UTC absolutas", () => {
  const start = new Date("2026-10-25T10:00:00Z"); // día del cambio de hora en UK
  const now = new Date("2026-10-24T10:00:00Z");
  assert.equal(hoursBeforeStart(start, now), 24);
});

const autoReleaseAt = new Date("2026-10-10T12:00:00Z");
const before = new Date("2026-10-08T12:00:00Z");
const after = new Date("2026-10-10T12:00:01Z");

test("liberación: tabla de la sección 7", () => {
  const cases: Array<[boolean, Parameters<typeof decideRelease>[0]["teamResponse"], Date, string]> = [
    [true, "confirmed", before, "release"],
    [true, null, before, "wait"],
    [true, null, after, "release"],
    [true, "reported_no_show", after, "under_review"],
    [true, "reported_other", after, "under_review"],
    [false, "confirmed", before, "release"],
    [false, null, before, "wait"],
    [false, null, after, "under_review"],
    [false, "reported_no_show", before, "refund_with_strike"],
    [false, "reported_other", after, "under_review"],
  ];
  for (const [checkedIn, teamResponse, now, expected] of cases) {
    assert.equal(
      decideRelease({ checkedIn, teamResponse, now, autoReleaseAt }),
      expected,
      `checkedIn=${checkedIn} response=${teamResponse} now=${now.toISOString()}`,
    );
  }
});

test("si el equipo reporta algo, nunca se libera solo aunque haya pasado el plazo", () => {
  for (const checkedIn of [true, false]) {
    for (const teamResponse of ["reported_no_show", "reported_other"] as const) {
      assert.notEqual(decideRelease({ checkedIn, teamResponse, now: after, autoReleaseAt }), "release");
    }
  }
});
