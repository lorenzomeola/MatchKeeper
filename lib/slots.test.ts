import assert from "node:assert/strict";
import { test } from "node:test";
import { bookedCount, isKeepersNeeded, keeperNames, slotsLabel } from "./slots.ts";

test("solo 1 o 2 porteros", () => {
  assert.ok(isKeepersNeeded(1) && isKeepersNeeded(2));
  assert.ok(!isKeepersNeeded(0) && !isKeepersNeeded(3) && !isKeepersNeeded(1.5));
});

test("reservados = candidaturas aceptadas", () => {
  assert.equal(bookedCount([{ status: "accepted" }, { status: "pending" }, { status: "accepted" }, { status: "rejected" }]), 2);
  assert.equal(bookedCount([]), 0);
});

test("etiqueta de plazas solo para partidos de 2 porteros", () => {
  assert.equal(slotsLabel(1, 0), null);
  assert.equal(slotsLabel(null, 0), null);
  assert.equal(slotsLabel(2, 0), "0 of 2 booked");
  assert.equal(slotsLabel(2, 1), "1 of 2 booked");
  assert.equal(slotsLabel(2, 2), "2 of 2 booked");
});

test("nombres de porteros", () => {
  assert.equal(keeperNames([]), "");
  assert.equal(keeperNames(["Sam"]), "Sam");
  assert.equal(keeperNames(["Sam", "Alex"]), "Sam and Alex");
});
