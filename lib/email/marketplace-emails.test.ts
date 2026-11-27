import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_DELAY_MS, CHAT_THROTTLE_MS, adminSupportKey, chatKey, chatNoticeAllowed, readAfter, supportKey } from "./chat-rules.ts";
import type { MarketplaceTemplateData } from "./marketplace-templates.ts";
import { renderEmail } from "./templates.ts";

const ctx = { siteUrl: "https://app.test", contactEmail: "help@test.dev" };
const url = "https://app.test/matches/1";

const SAMPLES: MarketplaceTemplateData = {
  application_received_team: { keeperName: "Sam", rate: "£30.00", pitch: "Hackney Marshes", when: "Saturday 10 October, 10:00 to 11:00", matchUrl: url },
  application_not_selected_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October", browseUrl: url },
  application_closed_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October", browseUrl: url },
  match_reopened_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October", matchUrl: url },
  keeper_approved: { dashboardUrl: url },
  review_received_keeper: { teamName: "Sunday FC", rating: 4, comment: "Great", pitch: "Hackney Marshes", profileUrl: url },
  chat_unread: { senderName: "Sunday FC", pitch: "Hackney Marshes", chatUrl: url },
  keeper_info_request: { question: "Where have you played?\nWhich days can you play?", replyTo: "admin@test.dev", profileUrl: url },
  support_unread: { chatUrl: url },
  match_digest_keeper: { count: 8, matches: ["Sat 10 Oct, 10:00 to 11:00 · Hackney Marshes · 7-a-side"], browseUrl: url, profileUrl: "https://app.test/profile" },
  match_updated_applicant: { pitch: "Hackney Marshes", when: "Saturday 10 October, 10:00 to 11:00", kind: "budget_up", changes: ["Budget: £30 → £45"], matchUrl: url },
  match_updated_keeper: { pitch: "Hackney Marshes", when: "Saturday 10 October, 10:00 to 11:00", kind: "details", changes: ["Date and time: Saturday 10 October → Sunday 11 October"], matchUrl: url, profileUrl: "https://app.test/profile" },
};

test("el aviso de partido editado cambia segun el caso", () => {
  const subject = (name: "match_updated_applicant" | "match_updated_keeper", kind: "budget_up" | "budget" | "details") =>
    renderEmail(name, { ...SAMPLES[name], kind } as never, ctx).subject;
  assert.equal(subject("match_updated_applicant", "budget_up"), "Hackney Marshes: the budget went up");
  assert.equal(subject("match_updated_applicant", "budget"), "Hackney Marshes: the budget changed");
  assert.equal(subject("match_updated_applicant", "details"), "Hackney Marshes: the match details changed");
  assert.equal(subject("match_updated_keeper", "budget_up"), "Budget raised: Hackney Marshes still needs a keeper");
  assert.equal(subject("match_updated_keeper", "details"), "Updated: Hackney Marshes still needs a keeper");
  const r = renderEmail("match_updated_keeper", SAMPLES.match_updated_keeper, ctx);
  assert.ok(r.text.includes("Date and time: Saturday 10 October → Sunday 11 October"));
});

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
      Object.entries(data).map(([k, v]) => [k, ["keeperName", "teamName", "senderName", "pitch", "comment", "question"].includes(k) ? evil : v]),
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

test("pregunta del admin: cada linea es un parrafo y las respuestas van al admin", () => {
  const r = renderEmail("keeper_info_request", SAMPLES.keeper_info_request, ctx);
  assert.equal(r.replyTo, "admin@test.dev");
  assert.ok(r.text.includes("Where have you played?\nWhich days can you play?"));
  assert.ok(r.html.includes(">Where have you played?</p>") && r.html.includes(">Which days can you play?</p>"));
  assert.ok(r.text.includes("Just reply to this email"));
});

test("las demas plantillas no llevan reply-to", () => {
  assert.equal(renderEmail("chat_unread", SAMPLES.chat_unread, ctx).replyTo, undefined);
  assert.equal(renderEmail("support_unread", SAMPLES.support_unread, ctx).replyTo, undefined);
});

test("claves de los avisos del chat con MatchKeeper", () => {
  assert.equal(supportKey("k1"), "support_unread:k1:");
  assert.equal(adminSupportKey("k1"), "admin:support_reply:k1:");
});

test("resumen semanal: lista, resto y como darse de baja", () => {
  const r = renderEmail("match_digest_keeper", SAMPLES.match_digest_keeper, ctx);
  assert.equal(r.subject, "8 open matches are looking for a keeper");
  assert.ok(r.text.includes("Hackney Marshes · 7-a-side"));
  assert.ok(r.text.includes("And 7 more on the map."));
  assert.ok(r.text.includes("turn it off in your profile: https://app.test/profile"));

  const one = renderEmail("match_digest_keeper", { ...SAMPLES.match_digest_keeper, count: 1 }, ctx);
  assert.equal(one.subject, "1 open match is looking for a keeper");
  assert.ok(!one.text.includes("more on the map"));

  const evil = renderEmail("match_digest_keeper", { ...SAMPLES.match_digest_keeper, matches: ["<b>x</b> Pitch"] }, ctx);
  assert.ok(!evil.html.includes("<b>x</b>"));
});

test("aprobacion de keeper: el texto depende del modo de pagos conocido", () => {
  const base = SAMPLES.keeper_approved;
  const free = renderEmail("keeper_approved", { ...base, payments: false }, ctx).text;
  const paid = renderEmail("keeper_approved", { ...base, payments: true }, ctx).text;
  const unavailable = renderEmail("keeper_approved", { ...base, payments: null }, ctx).text;

  assert.match(free, /apply to matches near you/i);
  assert.match(paid, /set up payments/i);
  assert.match(unavailable, /could not confirm.*booking settings/i);
  assert.doesNotMatch(unavailable, /set up payments|apply to matches near you/i);
});
