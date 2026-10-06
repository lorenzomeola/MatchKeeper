import assert from "node:assert/strict";
import { test } from "node:test";
import { keeperStanding, type StrikeInput } from "./strikes.ts";

const NOW = new Date("2026-10-06T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const strike = (kind: string | null, days: number, waived = false): StrikeInput => ({
  kind,
  createdAt: daysAgo(days),
  waivedAt: waived ? daysAgo(1) : null,
});

test("sin strikes: en regla", () => {
  assert.deepEqual(keeperStanding([], NOW), { points: 0, level: "good", noShows: 0, removalCandidate: false });
});

test("una cancelación tardía: solo aviso", () => {
  const s = keeperStanding([strike("late_cancel", 5)], NOW);
  assert.equal(s.points, 1);
  assert.equal(s.level, "warned");
});

test("dos cancelaciones tardías: revisión del admin", () => {
  assert.equal(keeperStanding([strike("late_cancel", 5), strike("late_cancel", 40)], NOW).level, "review");
});

test("tres cancelaciones tardías en 90 días: suspendido", () => {
  const s = keeperStanding([strike("late_cancel", 5), strike("late_cancel", 40), strike("late_cancel", 80)], NOW);
  assert.equal(s.points, 3);
  assert.equal(s.level, "suspended");
});

test("un solo no-show ya suspende", () => {
  const s = keeperStanding([strike("no_show", 2)], NOW);
  assert.equal(s.points, 3);
  assert.equal(s.level, "suspended");
  assert.equal(s.removalCandidate, false);
});

test("una cancelación tardía caduca a los 90 días, un no-show a los 12 meses", () => {
  assert.equal(keeperStanding([strike("late_cancel", 91)], NOW).level, "good");
  assert.equal(keeperStanding([strike("late_cancel", 89)], NOW).level, "warned");
  assert.equal(keeperStanding([strike("no_show", 200)], NOW).level, "suspended");
  assert.equal(keeperStanding([strike("no_show", 366)], NOW).level, "good");
});

test("un strike anulado por el admin no cuenta", () => {
  const s = keeperStanding([strike("no_show", 2, true)], NOW);
  assert.equal(s.points, 0);
  assert.equal(s.level, "good");
});

test("dos no-shows vigentes: candidato a retirada definitiva", () => {
  const s = keeperStanding([strike("no_show", 10), strike("no_show", 300)], NOW);
  assert.equal(s.noShows, 2);
  assert.equal(s.removalCandidate, true);
});

test("un no-show anulado no cuenta para la retirada", () => {
  assert.equal(keeperStanding([strike("no_show", 10), strike("no_show", 300, true)], NOW).removalCandidate, false);
});

test("un strike antiguo sin tipo cuenta como cancelación tardía", () => {
  const s = keeperStanding([strike(null, 10)], NOW);
  assert.equal(s.points, 1);
  assert.equal(keeperStanding([strike(null, 100)], NOW).points, 0);
});
