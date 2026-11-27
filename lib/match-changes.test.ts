import assert from "node:assert/strict";
import { test } from "node:test";
import { changeLine, diffMatch, updateKind, type MatchSnapshot } from "./match-changes.ts";

const base: MatchSnapshot = {
  starts_at: "2026-12-04T19:00:00Z",
  ends_at: "2026-12-04T20:00:00Z",
  address: "Hackney Marshes, London, E5 0AR",
  lat: 51.5546,
  lng: -0.0262,
  format: 5,
  surface: "grass",
  level: "Casual",
  budget_suggested: "30.00",
  keepers_needed: 1,
  pref_age_min: null,
  pref_age_max: null,
};

test("sin cambios relevantes no hay lista", () => {
  assert.deepEqual(diffMatch(base, { ...base }), []);
});

test("subir el presupuesto es un solo cambio de tipo budget_up", () => {
  const after = { ...base, budget_suggested: "45.00" };
  const changes = diffMatch(base, after);
  assert.deepEqual(changes.map(changeLine), ["Budget: £30 → £45"]);
  assert.equal(updateKind(changes, base, after), "budget_up");
});

test("bajar el presupuesto es budget, no budget_up", () => {
  const after = { ...base, budget_suggested: "25" };
  assert.equal(updateKind(diffMatch(base, after), base, after), "budget");
});

test("cambiar la hora y el presupuesto es un aviso de detalles", () => {
  const after = { ...base, starts_at: "2026-12-04T20:00:00Z", ends_at: "2026-12-04T21:00:00Z", budget_suggested: "40" };
  const changes = diffMatch(base, after);
  assert.deepEqual(changes.map((c) => c.field), ["when", "budget"]);
  assert.equal(updateKind(changes, base, after), "details");
});

test("otro campo es un cambio de lugar; mover el pin pocos metros no lo es", () => {
  const moved = { ...base, lat: 51.5547, lng: -0.0263, address: "Hackney Marshes" };
  assert.deepEqual(diffMatch(base, moved), []);
  const elsewhere = { ...base, address: "Regent's Park, London", lat: 51.5273, lng: -0.1535 };
  assert.deepEqual(diffMatch(base, elsewhere).map(changeLine), ["Pitch: Hackney Marshes → Regent's Park"]);
});

test("pasar de sin presupuesto a uno lo muestra", () => {
  const before = { ...base, budget_suggested: null };
  const after = { ...base, budget_suggested: 30 };
  assert.deepEqual(diffMatch(before, after).map(changeLine), ["Budget: not set → £30"]);
});
