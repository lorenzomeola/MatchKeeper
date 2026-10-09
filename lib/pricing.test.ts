import assert from "node:assert/strict";
import { test } from "node:test";
import {
  durationShort,
  durationText,
  isDuration,
  matchMinutes,
  rangeText,
  rateVsRange,
  recommendedRange,
  suggestedBudget,
} from "./pricing.ts";

test("rangos por bloque de formato y duracion", () => {
  assert.deepEqual(recommendedRange(5, 60), { min: 15, max: 30 });
  assert.deepEqual(recommendedRange(6, 90), { min: 20, max: 35 });
  assert.deepEqual(recommendedRange(7, 60), { min: 25, max: 35 });
  assert.deepEqual(recommendedRange(8, 120), { min: 35, max: 45 });
  assert.deepEqual(recommendedRange(9, 90), { min: 35, max: 45 });
  assert.deepEqual(recommendedRange(11, 120), { min: 40, max: 50 });
});

test("sin rango si falta el formato o la duracion no es estandar", () => {
  assert.equal(recommendedRange(null, 60), null);
  assert.equal(recommendedRange(undefined, 60), null);
  assert.equal(recommendedRange(5, 75), null);
  assert.equal(recommendedRange(5, 180), null);
  assert.equal(recommendedRange(4, 60), null);
  assert.equal(recommendedRange(12, 60), null);
});

test("los rangos crecen con la duracion y con el formato", () => {
  for (const f of [5, 7, 9]) {
    const [a, b, c] = [60, 90, 120].map((m) => recommendedRange(f, m)!);
    assert.ok(a.min < b.min && b.min < c.min);
    assert.ok(a.max < b.max && b.max < c.max);
  }
  for (const m of [60, 90, 120]) {
    assert.ok(recommendedRange(5, m)!.min < recommendedRange(7, m)!.min);
    assert.ok(recommendedRange(7, m)!.min < recommendedRange(9, m)!.min);
  }
});

test("presupuesto sugerido: punto medio en libras enteras", () => {
  assert.equal(suggestedBudget(5, 60), 23);
  assert.equal(suggestedBudget(7, 90), 35);
  assert.equal(suggestedBudget(11, 120), 45);
  assert.equal(suggestedBudget(null, 60), null);
  assert.equal(suggestedBudget(5, 75), null);
});

test("duracion del partido y validacion", () => {
  assert.equal(matchMinutes("2026-10-20T18:00:00Z", "2026-10-20T19:30:00Z"), 90);
  assert.ok(isDuration(60) && isDuration(90) && isDuration(120));
  assert.ok(!isDuration(45) && !isDuration(150) && !isDuration(0));
});

test("tarifa frente al rango: limites incluidos", () => {
  const r = { min: 15, max: 30 };
  assert.equal(rateVsRange(14.5, r), "below");
  assert.equal(rateVsRange(15, r), "within");
  assert.equal(rateVsRange(30, r), "within");
  assert.equal(rateVsRange(30.5, r), "above");
});

test("textos", () => {
  assert.equal(rangeText({ min: 15, max: 30 }), "£15 to £30");
  assert.equal(durationText(60), "1 hour");
  assert.equal(durationText(90), "1.5 hours");
  assert.equal(durationText(120), "2 hours");
  assert.equal(durationText(180), "3 hours");
  assert.equal(durationShort(60), "1 h");
  assert.equal(durationShort(90), "1.5 h");
  assert.equal(durationShort(75), "1.3 h");
});
