import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { authenticateEmailLink } from "./auth-email-link.ts";

const user = {
  id: "test-user",
  aud: "authenticated",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { display_name: "Test Player", role: "player", city: "London" },
  created_at: "2026-10-23T00:00:00Z",
};

function freshClient({ expired = false, singleUse = false } = {}) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const client = createClient("https://auth.example.com", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
        const reject = expired || (singleUse && calls.length > 1);
        return new Response(JSON.stringify(reject
          ? { msg: "Email link is invalid or has expired", code: "otp_expired" }
          : { access_token: "test-access-token", refresh_token: "test-refresh-token", expires_in: 3600, token_type: "bearer", user }), {
          status: reject ? 403 : 200,
          headers: { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" },
        });
      },
    },
  });
  return { auth: client.auth, calls };
}

test("signup token is verified without a PKCE verifier or prior browser session", async () => {
  const { auth, calls } = freshClient();
  const result = await authenticateEmailLink(auth, new URLSearchParams({
    token_hash: "signup-token", type: "email", next: "/reset-password",
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.user.id, user.id);
  assert.equal(result.next, null);
  assert.deepEqual(calls, [{
    url: "https://auth.example.com/auth/v1/verify",
    body: { token_hash: "signup-token", type: "email", gotrue_meta_security: {} },
  }]);
});

test("recovery token works in a fresh client and always opens password reset", async () => {
  const { auth, calls } = freshClient();
  const result = await authenticateEmailLink(auth, new URLSearchParams({
    token_hash: "recovery-token", type: "recovery", next: "https://other.example",
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.next, "/reset-password");
  assert.deepEqual(calls[0].body, { token_hash: "recovery-token", type: "recovery", gotrue_meta_security: {} });
});

test("expired recovery links fail without falling back to an existing session", async () => {
  const { auth } = freshClient({ expired: true });
  const result = await authenticateEmailLink(auth, new URLSearchParams({
    token_hash: "expired-token", type: "recovery",
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.recovery, true);
  assert.equal(result.error?.code, "otp_expired");
});

test("a reused token is rejected by verification", async () => {
  const { auth } = freshClient({ singleUse: true });
  const params = new URLSearchParams({ token_hash: "one-use-token", type: "email" });
  assert.equal((await authenticateEmailLink(auth, params)).ok, true);
  assert.equal((await authenticateEmailLink(auth, params)).ok, false);
});

test("missing tokens and unsupported types do not authenticate or fall back to code", async () => {
  for (const query of [
    "", "token_hash=", "token_hash=%20&type=email", "token_hash=test",
    "token_hash=test&type=invite", "token_hash=test&type=email_change",
    "token_hash=test&type=unknown&code=legacy", "token_hash=&type=recovery&code=legacy",
  ]) {
    const { auth, calls } = freshClient();
    assert.equal((await authenticateEmailLink(auth, new URLSearchParams(query))).ok, false);
    assert.equal(calls.length, 0);
  }
});

test("legacy PKCE links retain internal destinations", async () => {
  const { auth, calls } = freshClient();
  const result = await authenticateEmailLink(auth, new URLSearchParams({
    code: "legacy-code", next: "/reset-password",
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.next, "/reset-password");
  assert.match(calls[0].url, /\/token\?grant_type=pkce$/);
  assert.equal(calls[0].body.auth_code, "legacy-code");
});

test("legacy links reject external and backslash destinations", async () => {
  for (const next of ["https://other.example", "//other.example", "/\\other.example", "/\n/other.example", "/\n/["]) {
    const { auth } = freshClient();
    const result = await authenticateEmailLink(auth, new URLSearchParams({ code: "legacy-code", next }));
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.next, null);
  }
});

test("legacy recovery failures retain the retry destination", async () => {
  const { auth } = freshClient({ expired: true });
  const result = await authenticateEmailLink(auth, new URLSearchParams({ code: "expired", next: "/reset-password" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.recovery, true);
});

test("email templates produce valid token links for local, staging and production redirects", () => {
  for (const origin of ["http://localhost:3001", "https://staging.matchkeeperuk.com", "https://matchkeeperuk.com"]) {
    for (const [filename, next, type] of [
      ["confirm-signup.html", "", "email"],
      ["reset-password.html", "?next=/reset-password", "recovery"],
    ]) {
      const html = readFileSync(new URL(`../db/auth-email-templates/${filename}`, import.meta.url), "utf8");
      assert.equal(html.includes("{{ .ConfirmationURL }}"), false);
      const href = html.match(/href="(\{\{ \.RedirectTo \}\}[^"]+)"/)?.[1];
      assert.ok(href);
      const url = new URL(href
        .replace("{{ .RedirectTo }}", `${origin}/auth/callback${next}`)
        .replace("{{ .TokenHash }}", "test-token")
        .replaceAll("&amp;", "&"));
      assert.equal(url.origin, origin);
      assert.equal(url.pathname, "/auth/callback");
      assert.equal(url.searchParams.get("type"), type);
      assert.equal(url.searchParams.get("token_hash"), "test-token");
      assert.equal(url.searchParams.get("next"), next ? "/reset-password" : null);
    }
  }
});
