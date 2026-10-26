import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { cancellationWork } from "./money.ts";

function cancellationModule(booking: { status: string; payment_status: string; cancellation_charge_pct: number | null } | null) {
  let stripeCalls = 0;
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: booking, error: null }),
  };
  const exports = {
    processCancellationMoney: async (id: string): Promise<void> => { throw new Error(`Module not loaded: ${id}`); },
  };
  const source = readFileSync(new URL("./cancel-booking.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: () => query }) };
      if (name === "@/lib/stripe") return {
        getStripe: () => { stripeCalls++; throw new Error("STRIPE_SECRET_KEY is not set"); },
      };
      if (name === "./money") return { cancellationWork };
      if (name === "@/lib/email/booking-emails" || name === "@/lib/email/admin-emails" || name === "./release-booking") return {};
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { process: exports.processCancellationMoney, stripeCalls: () => stripeCalls };
}

test("a cancelled free-beta booking needs no Stripe configuration", async () => {
  const subject = cancellationModule({ status: "cancelled", payment_status: "none", cancellation_charge_pct: 0 });
  await subject.process("free-booking");
  assert.equal(subject.stripeCalls(), 0);
});

test("missing, active or unplanned bookings do not initialize Stripe", async () => {
  for (const row of [
    null,
    { status: "confirmed", payment_status: "held", cancellation_charge_pct: 0 },
    { status: "cancelled", payment_status: "held", cancellation_charge_pct: null },
  ]) {
    const subject = cancellationModule(row);
    await subject.process("not-payable");
    assert.equal(subject.stripeCalls(), 0);
  }
});

test("a paid cancellation still requires Stripe and surfaces missing configuration", async () => {
  const subject = cancellationModule({ status: "cancelled", payment_status: "held", cancellation_charge_pct: 0 });
  await assert.rejects(subject.process("paid-booking"), /STRIPE_SECRET_KEY is not set/);
  assert.equal(subject.stripeCalls(), 1);
});
