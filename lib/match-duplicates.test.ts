import assert from "node:assert/strict";
import { test } from "node:test";
import { isSamePlace } from "./match-duplicates.ts";

const pitch = { address: "Hackney Marshes, London", lat: 51.5546, lng: -0.0262 };

test("misma direccion es el mismo lugar aunque cambien mayusculas y espacios", () => {
  assert.equal(isSamePlace(pitch, { address: "  hackney  marshes, LONDON ", lat: 52, lng: 0 }), true);
});

test("coordenadas a pocos metros cuentan como el mismo lugar", () => {
  assert.equal(isSamePlace(pitch, { address: "Other label", lat: 51.5547, lng: -0.0263 }), true);
});

test("otro campo lejano no es el mismo lugar", () => {
  assert.equal(isSamePlace(pitch, { address: "Regent's Park", lat: 51.5273, lng: -0.1535 }), false);
});
