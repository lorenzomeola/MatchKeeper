import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { ErrorResponse, GetEmailResponseSuccess, Resend } from "resend";
import { finishCancelledSend, requestEmailCancellations, retryEmailCancellations } from "./cancellation.ts";

type Row = {
  id: string; dedupe_key: string; status: string; provider_id: string | null;
  attempts: number; send_after: string; claimed_at: string | null; last_error: string | null;
};
const past = () => new Date(Date.now() - 60_000).toISOString();
const row = (id: string, status = "scheduled"): Row => ({
  id, dedupe_key: `booking:test:${id}`, status, provider_id: `provider-${id}`,
  attempts: 1, send_after: past(), claimed_at: null, last_error: null,
});

function database(initial: Row[]) {
  const rows = structuredClone(initial);
  const requests: { url: URL; method: string; body: Partial<Row> | null }[] = [];
  let failNextUpdate = false;
  const admin = createClient("https://database.example.com", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        const body: Partial<Row> | null = init?.body ? JSON.parse(String(init.body)) : null;
        requests.push({ url, method, body });
        if (method === "PATCH" && failNextUpdate) {
          failNextUpdate = false;
          return new Response(JSON.stringify({ message: "Database unavailable", code: "test_db_error" }), { status: 500 });
        }
        let found = rows.filter(r => [...url.searchParams].every(([key, filter]) => {
          if (["select", "order", "limit"].includes(key)) return true;
          const value = r[key as keyof Row];
          const [op, ...rest] = filter.split(".");
          const expected = rest.join(".");
          if (op === "eq") return String(value) === expected;
          if (op === "lt") return value !== null && String(value) < expected;
          if (op === "lte") return value !== null && String(value) <= expected;
          if (op === "like") return String(value).startsWith(expected.replace(/%$/, ""));
          throw new Error(`Unsupported fixture filter ${filter}`);
        }));
        const limit = url.searchParams.get("limit");
        if (limit) found = found.slice(0, Number(limit));
        if (body) found.forEach(r => Object.assign(r, body));
        const single = new Headers(init?.headers).get("accept")?.includes("vnd.pgrst.object");
        return new Response(JSON.stringify(single ? found[0] ?? null : found), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  return { admin, rows, requests, failUpdate: () => { failNextUpdate = true; } };
}

const failure = (statusCode = 429, name: ErrorResponse["name"] = "rate_limit_exceeded"): ErrorResponse =>
  ({ statusCode, name, message: "Cancellation rejected" });
const providerEmail = (id: string, last_event: GetEmailResponseSuccess["last_event"]): GetEmailResponseSuccess => ({
  id, last_event, object: "email", from: "test@example.com", to: ["test@example.com"],
  bcc: null, cc: null, created_at: past(), message_id: "test", reply_to: null,
  subject: "Test", html: null, text: "Test", scheduled_at: past(),
});

function provider({
  cancelError = null,
  event = "scheduled",
  lookupError = null,
  throwOnCancel = false,
}: {
  cancelError?: ErrorResponse | null;
  event?: GetEmailResponseSuccess["last_event"];
  lookupError?: ErrorResponse | null;
  throwOnCancel?: boolean;
} = {}) {
  const calls: string[] = [];
  const emails: Pick<Resend["emails"], "cancel" | "get"> = {
    async cancel(id) {
      calls.push(`cancel:${id}`);
      if (throwOnCancel) throw new Error("Connection reset");
      return cancelError
        ? { data: null, error: cancelError, headers: null }
        : { data: { id, object: "email" }, error: null, headers: null };
    },
    async get(id) {
      calls.push(`get:${id}`);
      return lookupError
        ? { data: null, error: lookupError, headers: null }
        : { data: providerEmail(id, event), error: null, headers: null };
    },
  };
  return { emails: () => emails, calls };
}

test("cancellation intent survives 429 and cron retries cancellation, never sending", async t => {
  const logs = t.mock.method(console, "error", () => {});
  const db = database([row("reminder")]);
  const limited = provider({ cancelError: failure() });
  assert.equal(await requestEmailCancellations(db.admin, limited.emails, "booking:test:"), 0);
  assert.equal(db.rows[0].status, "cancel_pending");
  assert.equal(db.rows[0].attempts, 1);
  assert.match(db.rows[0].last_error ?? "", /rate_limit_exceeded/);
  const delay = Date.parse(db.rows[0].send_after) - Date.now();
  assert.ok(delay > 115_000 && delay <= 120_000);
  assert.equal(logs.mock.calls.length, 1);

  const healthy = provider();
  assert.equal((await retryEmailCancellations(db.admin, healthy.emails)).cancelled, 0);
  assert.equal(healthy.calls.length, 0);
  db.rows[0].send_after = past();
  assert.equal((await retryEmailCancellations(db.admin, healthy.emails)).cancelled, 1);
  assert.equal(db.rows[0].status, "cancelled");
  assert.equal(db.rows[0].last_error, null);
  assert.deepEqual(healthy.calls, ["cancel:provider-reminder"]);
  assert.ok(db.requests.every(r => r.url.pathname.includes("/email_outbox")));
});

test("network and 5xx failures remain cancellation retries", async t => {
  t.mock.method(console, "error", () => {});
  for (const options of [{ throwOnCancel: true }, { cancelError: failure(500, "internal_server_error") }]) {
    const db = database([row("reminder")]);
    const resend = provider(options);
    await requestEmailCancellations(db.admin, resend.emails, "booking:test:");
    assert.equal(db.rows[0].status, "cancel_pending");
    assert.ok(db.rows[0].last_error);
  }
});

test("a provider rejection only becomes sent when lookup confirms a sent event", async () => {
  for (const event of ["sent", "delivered", "opened", "bounced"] as const) {
    const db = database([row("reminder")]);
    const resend = provider({ cancelError: failure(422, "validation_error"), event });
    await requestEmailCancellations(db.admin, resend.emails, "booking:test:");
    assert.equal(db.rows[0].status, "sent");
    assert.deepEqual(resend.calls, ["cancel:provider-reminder", "get:provider-reminder"]);
  }
});

test("already cancelled at provider is idempotently reconciled", async () => {
  const db = database([row("reminder")]);
  const resend = provider({ cancelError: failure(422, "validation_error"), event: "canceled" });
  assert.equal(await requestEmailCancellations(db.admin, resend.emails, "booking:test:"), 1);
  assert.equal(db.rows[0].status, "cancelled");
  assert.equal(await requestEmailCancellations(db.admin, resend.emails, "booking:test:"), 0);
  assert.equal(resend.calls.length, 2);
});

test("still scheduled, queued, or failed at provider is never treated as sent", async t => {
  t.mock.method(console, "error", () => {});
  for (const event of ["scheduled", "queued", "failed", "suppressed"] as const) {
    const db = database([row("reminder")]);
    const resend = provider({ cancelError: failure(422, "validation_error"), event });
    await requestEmailCancellations(db.admin, resend.emails, "booking:test:");
    assert.notEqual(db.rows[0].status, "sent");
    assert.notEqual(db.rows[0].status, "cancelled");
    assert.ok(db.rows[0].last_error);
  }
});

test("permanent authorization failures and retry exhaustion are explicit cancellation failures", async t => {
  const logs = t.mock.method(console, "error", () => {});
  const db = database([row("forbidden")]);
  const forbidden = provider({ cancelError: failure(403, "invalid_access"), lookupError: failure(403, "invalid_access") });
  await requestEmailCancellations(db.admin, forbidden.emails, "booking:test:");
  assert.equal(db.rows[0].status, "cancel_failed");
  assert.ok(logs.mock.calls.length > 0);

  const exhausted = database([{ ...row("exhausted", "cancel_pending"), attempts: 4 }]);
  const limited = provider({ cancelError: failure() });
  const summary = await retryEmailCancellations(exhausted.admin, limited.emails);
  assert.equal(summary.cancellationFailed, 1);
  assert.equal(exhausted.rows[0].status, "cancel_failed");
  assert.equal(exhausted.rows[0].attempts, 5);
});

test("local pending emails cancel without provider calls and other prefixes are untouched", async () => {
  const db = database([
    { ...row("pending", "pending"), provider_id: null },
    { ...row("other"), dedupe_key: "booking:other:reminder" },
  ]);
  const resend = provider();
  assert.equal(await requestEmailCancellations(db.admin, resend.emails, "booking:test:"), 1);
  assert.equal(db.rows[0].status, "cancelled");
  assert.equal(db.rows[1].status, "scheduled");
  assert.equal(resend.calls.length, 0);
});

test("in-flight sender preserves cancellation and cancels once provider id is known", async () => {
  const db = database([{ ...row("sending", "sending"), provider_id: null, claimed_at: new Date().toISOString() }]);
  const resend = provider();
  await requestEmailCancellations(db.admin, resend.emails, "booking:test:");
  assert.equal(db.rows[0].status, "cancel_after_send");
  assert.equal(resend.calls.length, 0);
  await finishCancelledSend(db.admin, resend.emails, "sending", "provider-sending");
  assert.equal(db.rows[0].status, "cancelled");
  assert.deepEqual(resend.calls, ["cancel:provider-sending"]);
});

test("aborted unsent work cancels locally; unknown sender outcome requires manual reconciliation", async t => {
  t.mock.method(console, "error", () => {});
  const db = database([row("unsent", "cancel_after_send")]);
  const resend = provider();
  await finishCancelledSend(db.admin, resend.emails, "unsent");
  assert.equal(db.rows[0].status, "cancelled");
  db.rows[0].status = "cancel_after_send";
  await finishCancelledSend(db.admin, resend.emails, "unsent", null, "Unknown provider outcome");
  assert.equal(db.rows[0].status, "cancel_failed");
  assert.equal(db.rows[0].last_error, "Unknown provider outcome");
  assert.equal(resend.calls.length, 0);
});

test("stale cancellation claims retry; missing provider ids fail visibly without sending", async t => {
  t.mock.method(console, "error", () => {});
  const stale = new Date(Date.now() - 11 * 60_000).toISOString();
  const db = database([
    { ...row("stale", "cancelling"), claimed_at: stale },
    { ...row("orphan", "cancel_after_send"), claimed_at: stale, provider_id: null },
    { ...row("missing", "cancel_pending"), provider_id: null },
  ]);
  const resend = provider();
  const summary = await retryEmailCancellations(db.admin, resend.emails);
  assert.equal(summary.cancelled, 1);
  assert.equal(summary.cancellationFailed, 2);
  assert.equal(db.rows[0].status, "cancelled");
  assert.equal(db.rows[1].status, "cancel_failed");
  assert.equal(db.rows[2].status, "cancel_failed");
  assert.deepEqual(resend.calls, ["cancel:provider-stale"]);
});

test("concurrent cancellation workers atomically claim each reminder once", async () => {
  const db = database([row("concurrent", "cancel_pending")]);
  const resend = provider();
  await Promise.all([
    retryEmailCancellations(db.admin, resend.emails),
    retryEmailCancellations(db.admin, resend.emails),
  ]);
  assert.equal(db.rows[0].status, "cancelled");
  assert.equal(resend.calls.length, 1);
});

test("database errors propagate rather than reporting cancellation success", async () => {
  const db = database([row("error")]);
  const resend = provider();
  db.failUpdate();
  await assert.rejects(requestEmailCancellations(db.admin, resend.emails, "booking:test:"), { code: "test_db_error" });
  assert.equal(db.rows[0].status, "scheduled");
  assert.equal(resend.calls.length, 0);
});

test("a database write failure after provider cancellation recovers through provider reconciliation", async () => {
  const db = database([row("recover", "cancel_pending")]);
  const resend = provider();
  const emails = resend.emails();
  const cancel = emails.cancel.bind(emails);
  emails.cancel = async id => {
    const result = await cancel(id);
    db.failUpdate();
    return result;
  };
  await assert.rejects(retryEmailCancellations(db.admin, () => emails), { code: "test_db_error" });
  assert.equal(db.rows[0].status, "cancelling");
  db.rows[0].claimed_at = new Date(Date.now() - 11 * 60_000).toISOString();
  const reconciled = provider({ cancelError: failure(422, "validation_error"), event: "canceled" });
  assert.equal((await retryEmailCancellations(db.admin, reconciled.emails)).cancelled, 1);
  assert.equal(db.rows[0].status, "cancelled");
});

test("unavailable or mismatched provider lookup cannot manufacture sent status", async t => {
  t.mock.method(console, "error", () => {});
  const unavailable = database([row("unavailable")]);
  const limited = provider({ cancelError: failure(422, "validation_error"), lookupError: failure() });
  await requestEmailCancellations(unavailable.admin, limited.emails, "booking:test:");
  assert.equal(unavailable.rows[0].status, "cancel_pending");

  const mismatched = database([row("mismatched")]);
  const resend = provider({ cancelError: failure(422, "validation_error"), event: "delivered" });
  const emails = resend.emails();
  emails.get = async () => ({
    data: providerEmail("another-email", "delivered"), error: null, headers: null,
  });
  await requestEmailCancellations(mismatched.admin, () => emails, "booking:test:");
  assert.equal(mismatched.rows[0].status, "cancel_pending");
});
