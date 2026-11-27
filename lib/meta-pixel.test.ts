import assert from "node:assert/strict";
import test from "node:test";
import { cookieDomainsFor, isPixelPage, normalizePixelId, parseAdsConsent } from "./meta-pixel.ts";

test("pixel ID: only a trimmed numeric dataset ID enables the pixel", () => {
  assert.equal(normalizePixelId(" 123456789012345 \n"), "123456789012345");
  assert.equal(normalizePixelId(undefined), null);
  assert.equal(normalizePixelId(""), null);
  assert.equal(normalizePixelId("abc123456"), null);
  assert.equal(normalizePixelId("12345"), null);
});

test("consent: anything but an explicit choice counts as no choice yet", () => {
  assert.equal(parseAdsConsent("granted"), "granted");
  assert.equal(parseAdsConsent("denied"), "denied");
  assert.equal(parseAdsConsent(null), null);
  assert.equal(parseAdsConsent("yes"), null);
});

test("logged-in setup pages under (auth) never get the pixel", () => {
  assert.equal(isPixelPage("/signup/goalkeeper"), true);
  assert.equal(isPixelPage("/home"), true);
  assert.equal(isPixelPage("/onboarding"), false);
  assert.equal(isPixelPage("/reset-password"), false);
  assert.equal(isPixelPage("/onboarding-tips"), true);
});

test("revoking clears pixel cookies on the host and its parent domains", () => {
  assert.deepEqual(cookieDomainsFor("www.matchkeeperuk.com"), ["www.matchkeeperuk.com", "matchkeeperuk.com"]);
  assert.deepEqual(cookieDomainsFor("matchkeeperuk.com"), ["matchkeeperuk.com"]);
  assert.deepEqual(cookieDomainsFor("localhost"), []);
});
