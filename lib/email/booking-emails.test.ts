import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingSchedule } from "./schedule.ts";
import { renderEmail, type TemplateData, type TemplateName } from "./templates.ts";

const ctx = { siteUrl: "https://app.test", contactEmail: "help@test.dev" };
const url = "https://app.test/matches/1";
const base = { pitch: "Hackney Marshes", when: "Saturday 10 October, 10:00 to 11:00", matchUrl: url };

const SAMPLES: { [K in Exclude<TemplateName, "test">]: TemplateData[K] } = {
  booking_confirmed_team: { ...base, keeperName: "Sam", total: "£34.50", rate: "£30.00", fee: "£4.50" },
  booking_confirmed_keeper: { ...base, teamName: "Sunday FC", rate: "£30.00" },
  keeper_checkin_24h: { ...base, teamName: "Sunday FC" },
  keeper_checkin_30m: { ...base },
  team_played_prompt: { ...base, keeperName: "Sam" },
  team_played_reminder: { ...base, keeperName: "Sam" },
  team_autorelease_notice: { ...base, keeperName: "Sam", releaseOn: "13 Oct 2026" },
  payment_released_keeper: { teamName: "Sunday FC", pitch: base.pitch, amount: "£30.00", debt: null, paymentsUrl: url },
  booking_cancelled_team: { ...base, by: "team", keeperName: "Sam", refund: "£17.25", keeperGets: "£15.00" },
  booking_cancelled_keeper: { ...base, by: "team", teamName: "Sunday FC", share: "£15.00" },
  keeper_strike: { kind: "late_cancel", level: "warned", pitch: base.pitch, matchUrl: url },
  booking_review_team: { ...base, keeperName: "Sam" },
  booking_review_keeper: { ...base, teamName: "Sunday FC" },
  payout_failed_keeper: { message: "The bank account has been closed", paymentsUrl: url },
  checkout_expired_team: { keeperName: "Sam", pitch: base.pitch, matchUrl: url },
};

test("todas las plantillas de reservas se generan con asunto, texto y enlace", () => {
  for (const [name, data] of Object.entries(SAMPLES)) {
    const r = renderEmail(name as never, data as never, ctx);
    assert.ok(r.subject.length > 3, `${name}: subject`);
    assert.ok(r.html.includes("MatchKeeper") && r.text.length > 40, `${name}: body`);
    assert.ok(!/undefined|null|\[object/.test(r.html + r.text), `${name}: leaked placeholder`);
    assert.ok(r.html.includes(`href="${url}"`), `${name}: button link`);
  }
});

test("lo que escribe un usuario (nombres, campo) se escapa en el HTML de cada plantilla", () => {
  const evil = `<b>x</b>"&`;
  for (const [name, data] of Object.entries(SAMPLES)) {
    const poisoned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, ["keeperName", "teamName", "pitch", "message"].includes(k) ? evil : v]),
    );
    const r = renderEmail(name as never, poisoned as never, ctx);
    assert.ok(!r.html.includes("<b>x</b>"), `${name}: unescaped HTML`);
  }
});

test("cancelaciones: el texto cambia segun quien cancela y lo que se devuelve", () => {
  const team = (d: Partial<TemplateData["booking_cancelled_team"]>) =>
    renderEmail("booking_cancelled_team", { ...SAMPLES.booking_cancelled_team, ...d }, ctx).text;
  assert.match(team({ by: "team", refund: "£34.50", keeperGets: null }), /You cancelled/);
  assert.match(team({ by: "team", refund: "£34.50", keeperGets: null }), /refunded £34.50/);
  assert.match(team({ by: "team", refund: null, keeperGets: "£30.00" }), /No refund applies/);
  assert.match(team({ by: "keeper", refund: "£34.50", keeperGets: null }), /other keepers can apply/);
  assert.match(team({ by: "system", refund: "£34.50", keeperGets: null }), /MatchKeeper cancelled/);
  const keeper = (d: Partial<TemplateData["booking_cancelled_keeper"]>) =>
    renderEmail("booking_cancelled_keeper", { ...SAMPLES.booking_cancelled_keeper, ...d }, ctx).text;
  assert.match(keeper({ share: "£15.00" }), /paid £15.00/);
  assert.match(keeper({ share: null }), /No payment is due/);
});

test("strike: el aviso depende del nivel", () => {
  const strike = (level: TemplateData["keeper_strike"]["level"], kind: TemplateData["keeper_strike"]["kind"] = "late_cancel") =>
    renderEmail("keeper_strike", { ...SAMPLES.keeper_strike, level, kind }, ctx);
  assert.equal(strike("suspended").subject, "Your MatchKeeper account is suspended");
  assert.match(strike("suspended").text, /suspended/);
  assert.match(strike("review").text, /reviewed by an admin/);
  assert.match(strike("warned", "no_show").text, /did not show up/);
});

test("pago liberado: menciona la deuda solo si se descuenta", () => {
  const paid = (debt: string | null) => renderEmail("payment_released_keeper", { ...SAMPLES.payment_released_keeper, debt }, ctx).text;
  assert.ok(!paid(null).includes("disputed payment"));
  assert.match(paid("£12.00"), /£12.00 was taken/);
});

const H = 3_600_000;
const NOW = new Date("2026-10-08T12:00:00Z");
const at = (h: number) => new Date(NOW.getTime() + h * H);
const names = (r: ReturnType<typeof bookingSchedule>) => r.map((x) => x.template);

test("avisos programados: partido dentro de 5 dias, con liberacion automatica", () => {
  const r = bookingSchedule({ startsAt: at(120), endsAt: at(121), autoReleaseAt: at(121 + 72) }, NOW);
  assert.deepEqual(names(r), ["keeper_checkin_24h", "keeper_checkin_30m", "team_played_prompt", "team_played_reminder", "team_autorelease_notice"]);
  assert.equal(r[0].sendAfter.getTime(), at(96).getTime());
  assert.equal(r[1].sendAfter.getTime(), at(119.5).getTime());
  assert.equal(r[2].sendAfter.getTime(), at(121).getTime());
  assert.equal(r[3].sendAfter.getTime(), at(145).getTime());
  assert.equal(r[4].sendAfter.getTime(), at(169).getTime());
});

test("avisos programados: reserva de ultima hora omite los que ya no tienen sentido", () => {
  const r = bookingSchedule({ startsAt: at(10), endsAt: at(11), autoReleaseAt: at(11 + 72) }, NOW);
  assert.ok(!names(r).includes("keeper_checkin_24h"));
  assert.ok(names(r).includes("keeper_checkin_30m"));
  const veryLate = bookingSchedule({ startsAt: at(0.2), endsAt: at(1.2), autoReleaseAt: null }, NOW);
  assert.deepEqual(names(veryLate), ["team_played_prompt", "team_played_reminder"]);
});
