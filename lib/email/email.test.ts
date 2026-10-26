import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_ATTEMPTS,
  applyRedirect,
  classifyFailure,
  dedupeKey,
  planSend,
  retryDelayMs,
} from "./rules.ts";
import { escapeHtml, layout, renderEmail } from "./templates.ts";

const NOW = new Date("2026-10-08T12:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

test("admin booking review distinguishes a free-beta outcome from a held payment", () => {
  const data = {
    reason: "no_checkin_no_response", pitch: "QA pitch", when: "Friday",
    keeperName: "Keeper", teamName: "Team", amount: "£20.00",
    adminUrl: "https://example.com/admin/payments",
  };
  const context = { siteUrl: "https://example.com", contactEmail: "support@example.com" };
  const free = renderEmail("admin_booking_review", { ...data, free: true }, context);
  assert.match(free.text, /MatchKeeper does not handle payments/);
  assert.doesNotMatch(free.text, /No transfer has been made/);
  const paid = renderEmail("admin_booking_review", { ...data, free: false }, context);
  assert.match(paid.text, /No transfer has been made/);
  assert.doesNotMatch(paid.text, /free-beta booking/);
});

test("plan de envio: ya, programado en Resend o esperar", () => {
  assert.deepEqual(planSend(at(-5 * MIN), NOW), { kind: "now" });
  assert.deepEqual(planSend(at(30_000), NOW), { kind: "now" });
  const soon = at(30 * MIN);
  assert.deepEqual(planSend(soon, NOW), { kind: "schedule", at: soon });
  assert.deepEqual(planSend(at(28 * DAY), NOW), { kind: "schedule", at: at(28 * DAY) });
  // Resend programa hasta 30 dias: mas alla lo recoge la tarea periodica cuando toque.
  assert.deepEqual(planSend(at(40 * DAY), NOW), { kind: "later" });
});

test("reintentos: espera creciente y tope de intentos", () => {
  assert.deepEqual([1, 2, 3, 4, 9].map((n) => retryDelayMs(n) / MIN), [2, 10, 30, 120, 120]);
  assert.equal(MAX_ATTEMPTS, 5);
});

test("fallos de Resend: red y limites se reintentan, errores de datos no", () => {
  assert.equal(classifyFailure({ statusCode: 429, name: "rate_limit_exceeded" }), "retry");
  assert.equal(classifyFailure({ statusCode: 429, name: "daily_quota_exceeded" }), "retry");
  assert.equal(classifyFailure({ statusCode: 500, name: "internal_server_error" }), "retry");
  assert.equal(classifyFailure({ statusCode: null, name: "application_error" }), "retry");
  assert.equal(classifyFailure({ statusCode: 409, name: "concurrent_idempotent_requests" }), "retry");
  assert.equal(classifyFailure({ statusCode: 409, name: "resource_locked" }), "retry");
  assert.equal(classifyFailure({ statusCode: 422, name: "validation_error" }), "permanent");
  assert.equal(classifyFailure({ statusCode: 403, name: "invalid_access" }), "permanent");
  assert.equal(classifyFailure({ statusCode: 401, name: "invalid_api_key" }), "permanent");
});

test("redireccion de pruebas: todo a una direccion y el asunto dice a quien iba", () => {
  assert.deepEqual(applyRedirect("team@example.com", "Booked", undefined), { to: "team@example.com", subject: "Booked" });
  assert.deepEqual(applyRedirect("team@example.com", "Booked", "  "), { to: "team@example.com", subject: "Booked" });
  assert.deepEqual(applyRedirect("team@example.com", "Booked", "me@example.com"), {
    to: "me@example.com",
    subject: "[to: team@example.com] Booked",
  });
});

test("clave de duplicado", () => {
  assert.equal(dedupeKey("booking_confirmed", "abc", "team"), "booking_confirmed:abc:team");
});

const ctx = { siteUrl: "https://app.test", contactEmail: "help@test.dev" };

test("el contenido de un usuario se escapa en el HTML", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script> & 'q'`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;");
  const r = renderEmail("test", { message: `Hi <img src=x onerror=alert(1)> "Pitch"` }, ctx);
  assert.ok(!r.html.includes("<img src=x"));
  assert.ok(r.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  // El texto plano va sin escapar, tal cual.
  assert.ok(r.text.includes(`<img src=x onerror=alert(1)>`));
});

test("la plantilla trae asunto, boton, pie y version de texto", () => {
  const r = renderEmail("test", { message: "It works" }, ctx);
  assert.equal(r.subject, "MatchKeeper email test");
  assert.ok(r.html.includes("Open MatchKeeper") && r.html.includes('href="https://app.test"'));
  assert.ok(r.html.includes("help@test.dev"));
  assert.ok(r.text.includes("Open MatchKeeper: https://app.test"));
});

test("la cabecera lleva el logo de MatchKeeper desde la URL del sitio", () => {
  const r = renderEmail("test", { message: "x" }, ctx);
  assert.ok(r.html.includes('src="https://app.test/brand/email-logo.png"'));
  assert.ok(r.html.includes('alt="MatchKeeper"'));
});

test("un enlace que no es http(s) no genera boton", () => {
  const r = layout({ title: "T", paragraphs: ["p"], cta: { label: "Click", url: "javascript:alert(1)" } }, ctx);
  assert.ok(!r.html.includes("javascript:"));
  assert.ok(!r.html.includes("Click"));
});

test("plantilla desconocida: error claro", () => {
  assert.throws(() => renderEmail("nope" as never, {} as never, ctx), /Unknown email template/);
});
