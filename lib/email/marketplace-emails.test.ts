import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_DELAY_MS, CHAT_THROTTLE_MS, chatKey, chatNoticeAllowed, readAfter } from "./chat-rules.ts";
import type { MarketplaceTemplateData } from "./marketplace-templates.ts";
import { renderEmail } from "./templates.ts";

const ctx = { siteUrl: "https://app.test", contactEmail: "help@test.dev" };
const url = "https://app.test/matches/1";

const SAMPLES: MarketplaceTemplateData = {
  application_received_team: { keeperName: "Sam", rate: "£30.00", pitch: "Hackney Marshes", when: "Saturday 10 October, 10:00 to 11:00", matchUrl: url },
  application_not_selected_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October", browseUrl: url },
  match_reopened_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October", matchUrl: url },
  keeper_approved: { dashboardUrl: url },
  review_received_keeper: { teamName: "Sunday FC", rating: 4, comment: "Great", pitch: "Hackney Marshes", profileUrl: url },
  chat_unread: { senderName: "Sunday FC", pitch: "Hackney Marshes", chatUrl: url },
};

test("todas las plantillas de marketplace se generan con asunto, texto y enlace", () => {
  for (const [name, data] of Object.entries(SAMPLES)) {
    const r = renderEmail(name as never, data as never, ctx);
    assert.ok(r.subject.length > 3, `${name}: subject`);
    assert.ok(r.text.length > 40, `${name}: body`);
    assert.ok(!/undefined|null|\[object/.test(r.html + r.text), `${name}: leaked placeholder`);
    assert.ok(r.html.includes(`href="${url}"`), `${name}: button link`);
  }
});

test("lo que escribe un usuario se escapa en el HTML", () => {
  const evil = `<b>x</b>"&`;
  const poisoned = Object.entries(SAMPLES).map(([name, data]) => [
    name,
    Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, ["keeperName", "teamName", "senderName", "pitch", "comment"].includes(k) ? evil : v]),
    ),
  ]);
  for (const [name, data] of poisoned) {
    const r = renderEmail(name as never, data as never, ctx);
    assert.ok(!r.html.includes("<b>x</b>"), `${name}: unescaped HTML`);
  }
});

test("el aviso de chat no lleva el texto del mensaje", () => {
  const r = renderEmail("chat_unread", SAMPLES.chat_unread, ctx);
  assert.ok(r.text.includes("Sunday FC sent you a message about Hackney Marshes"));
});

test("reseña: sin comentario no deja una linea vacia ni comillas", () => {
  const r = renderEmail("review_received_keeper", { ...SAMPLES.review_received_keeper, comment: null }, ctx);
  assert.ok(!r.text.includes('""'));
  assert.ok(r.text.includes("★★★★☆"));
  assert.equal(r.subject, "Sunday FC left you a 4-star review");
});

test("chat: un aviso por hora y destinatario", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  assert.equal(chatNoticeAllowed(null, now), true);
  assert.equal(chatNoticeAllowed(new Date(now.getTime() - 59 * 60_000), now), false);
  assert.equal(chatNoticeAllowed(new Date(now.getTime() - CHAT_THROTTLE_MS), now), true);
  assert.equal(CHAT_DELAY_MS, 10 * 60_000);
});

test("chat: leido despues del mensaje no avisa", () => {
  const msg = new Date("2026-10-09T12:00:00Z");
  assert.equal(readAfter(null, msg), false);
  assert.equal(readAfter(new Date("2026-10-09T11:59:59Z"), msg), false);
  assert.equal(readAfter(msg, msg), true);
  assert.equal(readAfter(new Date("2026-10-09T12:05:00Z"), msg), true);
});

test("clave del aviso de chat: prefijo estable por hilo y destinatario", () => {
  assert.equal(chatKey("app1", "user1"), "chat_unread:app1:user1:");
});
