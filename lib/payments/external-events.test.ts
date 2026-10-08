import assert from "node:assert/strict";
import { test } from "node:test";
import { nextPayoutProblem, refundOutsideApp } from "./external-events.ts";

test("reembolso hecho fuera de la app: solo una reserva activa pasa a revision", () => {
  assert.equal(refundOutsideApp("confirmed"), "review");
  assert.equal(refundOutsideApp("under_review"), "log");
  assert.equal(refundOutsideApp("completed"), "log");
  // Los reembolsos de la propia app llegan con la reserva ya cancelada.
  assert.equal(refundOutsideApp("cancelled"), "ignore");
  assert.equal(refundOutsideApp("pending_payment"), "ignore");
});

const at = (s: number) => new Date(s * 1000);

test("pago fallido: se avisa y se borra con un pago posterior", () => {
  const failed = nextPayoutProblem(null, { type: "payout.failed", at: at(100), message: "Account closed" });
  assert.deepEqual(failed, { failedAt: at(100), message: "Account closed" });
  assert.equal(nextPayoutProblem(failed, { type: "payout.paid", at: at(200) }), null);
});

test("pago fallido: eventos desordenados no cambian el estado", () => {
  const failed = nextPayoutProblem(null, { type: "payout.failed", at: at(100), message: "x" });
  // Un pago anterior al fallo llega tarde: el aviso sigue.
  assert.equal(nextPayoutProblem(failed, { type: "payout.paid", at: at(50) }), failed);
  // Un fallo anterior llega tarde: no pisa al reciente.
  assert.equal(nextPayoutProblem(failed, { type: "payout.failed", at: at(60), message: "old" }), failed);
  // Sin aviso previo un pago no hace nada.
  assert.equal(nextPayoutProblem(null, { type: "payout.paid", at: at(10) }), null);
});

test("pago fallido sin mensaje de Stripe", () => {
  assert.deepEqual(nextPayoutProblem(null, { type: "payout.failed", at: at(1) }), { failedAt: at(1), message: null });
});
