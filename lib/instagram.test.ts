import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeInstagram } from "./instagram.ts";

test("acepta usuario, @usuario y enlace al perfil", () => {
  for (const input of ["sam.keeper_1", "@sam.keeper_1", " @Sam.Keeper_1 ", "https://www.instagram.com/sam.keeper_1/", "instagram.com/sam.keeper_1?hl=en"]) {
    assert.equal(normalizeInstagram(input), "sam.keeper_1", input);
  }
});

test("rechaza vacio, espacios, simbolos y demasiado largo", () => {
  for (const input of ["", "@", "sam keeper", "sam-keeper", "a".repeat(31), "https://tiktok.com/@sam"]) {
    assert.equal(normalizeInstagram(input), null, input);
  }
});
