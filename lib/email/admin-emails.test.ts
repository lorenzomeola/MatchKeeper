import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewReasonText, type AdminTemplateData } from "./admin-templates.ts";
import { renderEmail } from "./templates.ts";

const ctx = { siteUrl: "https://app.test", contactEmail: "help@test.dev" };
const url = "https://app.test/admin/x";

const SAMPLES: AdminTemplateData = {
  admin_new_keeper: { name: "Sam Keeper", city: "London", adminUrl: url },
  admin_dispute: { inquiry: false, amount: "£33.60", reason: "product not received", dueBy: "Friday 23 October", matched: true, adminUrl: url },
  admin_booking_review: { reason: "no_checkin_no_response", pitch: "Hackney Marshes", when: "Saturday 10 October", keeperName: "Sam", teamName: "Sunday FC", amount: "£33.60", adminUrl: url },
  admin_report: { reporterName: "Sunday FC", reportedName: "Sam", reason: "Rude or abusive", details: "Said something rude", adminUrl: url },
  admin_keeper_standing: { keeperName: "Sam", level: "suspended", points: 3, removalCandidate: false, adminUrl: url },
  admin_payment_problem: { kind: "cancellation", pitch: "Hackney Marshes", keeperName: "Sam", teamName: "Sunday FC", detail: "No such charge", adminUrl: url },
};

test("todas las plantillas de admin se generan con asunto [Admin], texto y enlace", () => {
  for (const [name, data] of Object.entries(SAMPLES)) {
    const r = renderEmail(name as never, data as never, ctx);
    assert.ok(r.subject.startsWith("[Admin] "), `${name}: subject`);
    assert.ok(r.text.length > 40, `${name}: body`);
    assert.ok(!/undefined|null|\[object/.test(r.html + r.text), `${name}: leaked placeholder`);
    assert.ok(r.html.includes(`href="${url}"`), `${name}: button link`);
  }
});

test("lo que escribe un usuario se escapa en el HTML de admin", () => {
  const evil = `<b>x</b>"&`;
  const poisoned = Object.entries(SAMPLES).map(([name, data]) => [
    name,
    Object.fromEntries(
      Object.entries(data).map(([k, v]) =>
        ["name", "keeperName", "teamName", "pitch", "reporterName", "reportedName", "reason", "details", "detail", "city"].includes(k) ? [k, evil] : [k, v],
      ),
    ),
  ]);
  for (const [name, data] of poisoned) {
    const r = renderEmail(name as never, data as never, ctx);
    assert.ok(!r.html.includes("<b>x</b>"), `${name}: unescaped HTML`);
  }
});

test("motivos de revision conocidos y desconocidos", () => {
  assert.match(reviewReasonText("no_checkin_no_response"), /did not check in/);
  assert.match(reviewReasonText("team_reported_other"), /reported a problem/);
  assert.match(reviewReasonText("refunded_in_stripe"), /refunded directly in Stripe/);
  assert.equal(reviewReasonText("something_new"), "Moved to review (something_new).");
});

test("disputa: distingue consulta de disputa y avisa si no hay reserva", () => {
  const dispute = (d: Partial<AdminTemplateData["admin_dispute"]>) => renderEmail("admin_dispute", { ...SAMPLES.admin_dispute, ...d }, ctx);
  assert.equal(dispute({ inquiry: true }).subject, "[Admin] Payment inquiry for £33.60");
  assert.match(dispute({}).text, /Evidence is due by Friday 23 October/);
  assert.match(dispute({ dueBy: null }).text, /no evidence deadline/);
  assert.match(dispute({ matched: false }).text, /No booking matches/);
});

test("strikes: suspendido, revision y candidato a retirada", () => {
  const standing = (d: Partial<AdminTemplateData["admin_keeper_standing"]>) => renderEmail("admin_keeper_standing", { ...SAMPLES.admin_keeper_standing, ...d }, ctx);
  assert.equal(standing({}).subject, "[Admin] Sam is suspended");
  assert.equal(standing({ level: "review", points: 2 }).subject, "[Admin] Sam is at review level");
  assert.ok(!standing({}).text.includes("permanent removal"));
  assert.match(standing({ removalCandidate: true }).text, /permanent removal/);
});

test("problema de pago: un texto por tipo y el error solo si lo hay", () => {
  const problem = (d: Partial<AdminTemplateData["admin_payment_problem"]>) => renderEmail("admin_payment_problem", { ...SAMPLES.admin_payment_problem, ...d }, ctx);
  assert.match(problem({ kind: "release" }).subject, /Keeper payment failed/);
  assert.match(problem({ kind: "refund_after_payout" }).text, /already been paid/);
  assert.ok(!problem({ detail: null }).text.includes("Error:"));
});
