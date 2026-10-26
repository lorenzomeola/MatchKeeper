import assert from "node:assert/strict";
import { test } from "node:test";
import { cancellationPlan, cancellationWork, fullRefundPlan, noShowPlan, withoutMoney } from "./money.ts";

test("sin cobro (beta): se quitan los importes pero se conservan el strike y el estado del partido", () => {
  const keeperLate = withoutMoney(cancellationPlan(3000, 15, "keeper", 12));
  assert.equal(keeperLate.refundPence, 0);
  assert.equal(keeperLate.keeperSharePence, 0);
  assert.equal(keeperLate.chargedPence, 0);
  assert.equal(keeperLate.chargePct, 0);
  assert.equal(keeperLate.strikeKind, "late_cancel");
  assert.equal(keeperLate.matchAfter, "open");

  const noShow = withoutMoney(noShowPlan(3000, 15));
  assert.equal(noShow.refundPence, 0);
  assert.equal(noShow.strikeKind, "no_show");

  // Con importes a cero no queda ningun trabajo de dinero pendiente.
  const work = cancellationWork({
    ratePence: 3000,
    commissionPct: 0,
    chargePct: withoutMoney(cancellationPlan(3000, 15, "team", 1)).chargePct,
    paymentStatus: "none",
    transferId: null,
  });
  assert.equal(work.refundPending, false);
  assert.equal(work.payoutPending, false);
});

test("reembolso total de admin: todo al equipo, sin strike", () => {
  const p = fullRefundPlan(3000, 15);
  assert.equal(p.refundPence, 3450);
  assert.equal(p.keeperSharePence, 0);
  assert.equal(p.strike, false);
  assert.equal(p.strikeKind, null);
  assert.equal(p.matchAfter, "cancelled");
});

// Tarifa de 30 libras: total 3450 (3000 + 450 de comisión).
const plan = (actor: "team" | "keeper", hours: number) => cancellationPlan(3000, 15, actor, hours);

test("equipo cancela con mas de 24 h: reembolso total, nada para el portero, partido cancelado", () => {
  const p = plan("team", 48);
  assert.equal(p.refundPence, 3450);
  assert.equal(p.keeperSharePence, 0);
  assert.equal(p.strike, false);
  assert.equal(p.strikeKind, null);
  assert.equal(p.matchAfter, "cancelled");
});

test("equipo cancela entre 24 h y 2 h: se reembolsa la mitad y el portero cobra 15 libras", () => {
  const p = plan("team", 12);
  assert.equal(p.chargePct, 50);
  assert.equal(p.refundPence, 1725);
  assert.equal(p.keeperSharePence, 1500);
  assert.equal(p.matchAfter, "cancelled");
});

test("equipo cancela con menos de 2 h: sin reembolso y el portero cobra todo", () => {
  const p = plan("team", 1);
  assert.equal(p.refundPence, 0);
  assert.equal(p.keeperSharePence, 3000);
});

test("portero cancela con mas de 24 h: reembolso total, sin strike, el partido se reabre", () => {
  const p = plan("keeper", 30);
  assert.equal(p.refundPence, 3450);
  assert.equal(p.keeperSharePence, 0);
  assert.equal(p.strike, false);
  assert.equal(p.matchAfter, "open");
});

test("portero cancela entre 24 h y 2 h: strike y el partido se reabre", () => {
  const p = plan("keeper", 12);
  assert.equal(p.refundPence, 3450);
  assert.equal(p.strike, true);
  assert.equal(p.strikeKind, "late_cancel");
  assert.equal(p.matchAfter, "open");
});

test("portero cancela con 2 h o menos: strike y el partido NO se reabre", () => {
  for (const hours of [2, 1, 0, -1]) {
    const p = plan("keeper", hours);
    assert.equal(p.strike, true);
    assert.equal(p.matchAfter, "cancelled");
  }
});

test("limite exacto de 2 h para reabrir: 2.01 reabre, 2.00 no", () => {
  assert.equal(plan("keeper", 2.01).matchAfter, "open");
  assert.equal(plan("keeper", 2).matchAfter, "cancelled");
});

test("no-show: reembolso total, strike de tipo no_show y partido cancelado", () => {
  const p = noShowPlan(3000, 15);
  assert.equal(p.refundPence, 3450);
  assert.equal(p.keeperSharePence, 0);
  assert.equal(p.strike, true);
  assert.equal(p.strikeKind, "no_show");
  assert.equal(p.matchAfter, "cancelled");
});

test("en todos los casos lo reembolsado + lo cobrado suma el total", () => {
  for (const rate of [500, 1005, 2500, 3000, 8000]) {
    for (const actor of ["team", "keeper"] as const) {
      for (const hours of [100, 30, 12, 1, -2]) {
        const p = cancellationPlan(rate, 15, actor, hours);
        const total = rate + Math.round((rate * 15) / 100);
        assert.equal(p.chargedPence + p.refundPence, total);
      }
    }
  }
});

test("trabajo pendiente: reembolso total sin pagar al portero", () => {
  const w = cancellationWork({ ratePence: 3000, commissionPct: 15, chargePct: 0, paymentStatus: "held", transferId: null });
  assert.deepEqual(w, { refundPence: 3450, payoutPence: 0, refundPending: true, payoutPending: false });
});

test("trabajo pendiente: 50% pendiente de reembolso y de pago", () => {
  const w = cancellationWork({ ratePence: 3000, commissionPct: 15, chargePct: 50, paymentStatus: "held", transferId: null });
  assert.deepEqual(w, { refundPence: 1725, payoutPence: 1500, refundPending: true, payoutPending: true });
});

test("trabajo pendiente: reanudar tras reembolsar solo falta pagar al portero", () => {
  const w = cancellationWork({
    ratePence: 3000,
    commissionPct: 15,
    chargePct: 50,
    paymentStatus: "partially_refunded",
    transferId: null,
  });
  assert.equal(w.refundPending, false);
  assert.equal(w.payoutPending, true);
});

test("trabajo pendiente: 100% no hay reembolso y al pagar queda todo hecho", () => {
  const pending = cancellationWork({ ratePence: 3000, commissionPct: 15, chargePct: 100, paymentStatus: "held", transferId: null });
  assert.equal(pending.refundPending, false);
  assert.equal(pending.payoutPending, true);
  const done = cancellationWork({ ratePence: 3000, commissionPct: 15, chargePct: 100, paymentStatus: "released", transferId: "tr_1" });
  assert.equal(done.payoutPending, false);
});

test("trabajo pendiente: nada pendiente cuando ya esta reembolsado por completo", () => {
  const w = cancellationWork({ ratePence: 3000, commissionPct: 15, chargePct: 0, paymentStatus: "refunded", transferId: null });
  assert.equal(w.refundPending, false);
  assert.equal(w.payoutPending, false);
});

test("trabajo pendiente: un pago que quedo en cero por una deuda (sin transferencia) cuenta como hecho", () => {
  const base = { ratePence: 3000, commissionPct: 15, chargePct: 100, paymentStatus: "released", transferId: null };
  assert.equal(cancellationWork(base).payoutPending, true);
  assert.equal(cancellationWork({ ...base, releasedAt: "2026-10-06T12:00:00Z" }).payoutPending, false);
});
