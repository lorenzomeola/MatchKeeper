import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGEST_QUIET_AFTER_CHAT_MS, digestKey, digestLine, messagedRecently, pickDigestMatches, type DigestMatch } from "./digest-rules.ts";

const match = (id: string, startsAt: string, createdBy = "team"): DigestMatch => ({
  id,
  created_by: createdBy,
  starts_at: startsAt,
  ends_at: new Date(Date.parse(startsAt) + 3_600_000).toISOString(),
  address: "Hackney Marshes, Homerton Rd, London",
  format: 7,
});

test("resumen: sin partidos ya aplicados ni propios, el mas proximo primero", () => {
  const list = [match("b", "2026-11-28T10:00:00Z"), match("a", "2026-11-26T19:00:00Z"), match("c", "2026-11-27T10:00:00Z"), match("own", "2026-11-26T09:00:00Z", "k1")];
  assert.deepEqual(pickDigestMatches(list, "k1", new Set(["c"])).map((m) => m.id), ["a", "b"]);
  assert.deepEqual(pickDigestMatches(list, "k1", new Set(["a", "b", "c"])), []);
});

test("resumen: cada linea dice cuando, donde y formato en hora de Londres", () => {
  assert.equal(digestLine(match("a", "2026-07-04T09:00:00Z")), "Sat 4 Jul, 10:00 to 11:00 · Hackney Marshes · 7-a-side");
  assert.equal(digestLine({ ...match("a", "2026-12-05T10:00:00Z"), format: null, address: null }), "Sat 5 Dec, 10:00 to 11:00 · Pitch to be confirmed");
});

test("resumen: una clave por portero y dia de Londres", () => {
  assert.equal(digestKey("k1", new Date("2026-11-25T17:00:00Z")), "match_digest:k1:2026-11-25");
  assert.equal(digestKey("k1", new Date("2026-07-01T23:30:00Z")), "match_digest:k1:2026-07-02");
});

test("resumen: se salta a quien un admin escribio en las ultimas 24 horas", () => {
  const now = new Date("2026-11-25T17:00:00Z");
  assert.equal(messagedRecently(null, now), false);
  assert.equal(messagedRecently(new Date(now.getTime() - 3_600_000), now), true);
  assert.equal(messagedRecently(new Date(now.getTime() - DIGEST_QUIET_AFTER_CHAT_MS), now), false);
});
