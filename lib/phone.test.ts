import assert from "node:assert/strict";
import { test } from "node:test";
import { formatUkMobile, normalizeUkMobile } from "./phone.ts";

test("acepta formatos habituales de movil UK", () => {
  for (const input of ["07700 900123", "07700900123", "+44 7700 900123", "+447700900123", "0044 7700 900123", "(07700) 900-123"]) {
    assert.equal(normalizeUkMobile(input), "+447700900123", input);
  }
});

test("rechaza fijos, numeros cortos y extranjeros", () => {
  for (const input of ["", "020 7946 0018", "0770090012", "077009001234", "+34 612 345 678", "+44 20 7946 0018", "hello"]) {
    assert.equal(normalizeUkMobile(input), null, input);
  }
});

test("formatea en nacional para mostrar", () => {
  assert.equal(formatUkMobile("+447700900123"), "07700 900123");
});
