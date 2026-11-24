import assert from "node:assert/strict";
import { test } from "node:test";
import { SUPPORT_TEMPLATES, fillTemplate, linkifyOwn, missingPhrase, openMatchesPhrase } from "./support-templates.ts";

const origin = "https://app.test";

test("rellena las variables conocidas y deja las que faltan a la vista", () => {
  assert.equal(fillTemplate("Hi {name}, see {browseLink}", { name: "Sam", browseLink: `${origin}/map` }), `Hi Sam, see ${origin}/map`);
  assert.equal(fillTemplate("Hi {name}, {pitch}", { name: "Sam" }), "Hi Sam, {pitch}");
  assert.equal(fillTemplate("{unknown} stays", { name: "Sam" }), "{unknown} stays");
});

test("el envio masivo deja {name} para rellenarlo por portero", () => {
  const body = SUPPORT_TEMPLATES.find((t) => t.id === "open_matches")!.body;
  const draft = fillTemplate(body, { openMatches: openMatchesPhrase(3), browseLink: `${origin}/map` });
  assert.ok(draft.startsWith("Hi {name}, there are 3 open matches looking for a keeper"));
  assert.equal(fillTemplate(draft, { name: "Alex" }).startsWith("Hi Alex, there are 3"), true);
});

test("todas las plantillas caben en un mensaje una vez rellenas", () => {
  const vars = {
    name: "Bartholomew",
    missing: missingPhrase(["Photo", "Bio", "Age range"]),
    profileLink: `${origin}/profile`,
    browseLink: `${origin}/map`,
    openMatches: openMatchesPhrase(12),
    pitch: "Hackney Marshes",
    when: "Saturday 10 October, 10:00 to 11:00",
    matchLink: `${origin}/matches/00000000-0000-0000-0000-000000000000`,
  };
  for (const t of SUPPORT_TEMPLATES) {
    const text = fillTemplate(t.body, vars);
    assert.ok(text.length <= 1000, t.id);
    assert.ok(!/\{\w+\}/.test(text), `${t.id}: unfilled variable`);
  }
});

test("frase de partidos abiertos en singular y plural", () => {
  assert.equal(openMatchesPhrase(1), "there is 1 open match");
  assert.equal(openMatchesPhrase(4), "there are 4 open matches");
  assert.equal(openMatchesPhrase(0), "there are no open matches");
});

test("lo que falta del perfil se lee como una frase", () => {
  assert.equal(missingPhrase([]), "[what is missing]");
  assert.equal(missingPhrase(["Photo"]), "photo");
  assert.equal(missingPhrase(["Photo", "Bio", "Age range"]), "photo, bio and age range");
});

test("solo los enlaces a la propia app se pueden pulsar", () => {
  const parts = linkifyOwn(`Apply here: ${origin}/matches/1. Or https://evil.test/x`, origin);
  assert.deepEqual(parts, [
    { text: "Apply here: " },
    { text: `${origin}/matches/1`, href: `${origin}/matches/1` },
    { text: ". Or https://evil.test/x" },
  ]);
  assert.deepEqual(linkifyOwn("no links", origin), [{ text: "no links" }]);
  assert.equal(linkifyOwn(`${origin}.evil.test/x`, origin).some((p) => p.href), false);
});
