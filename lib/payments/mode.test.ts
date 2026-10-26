import assert from "node:assert/strict";
import test from "node:test";
import { readPaymentMode, resolvePaymentMode } from "./mode-state.ts";

test("an explicit false flag selects the free beta", () => {
  assert.equal(resolvePaymentMode({ data: { value: "false" }, error: null }), "free");
});

test("an explicit true flag selects paid bookings", () => {
  assert.equal(resolvePaymentMode({ data: { value: "true" }, error: null }), "paid");
});

test("a missing flag defaults to the free beta", () => {
  assert.equal(resolvePaymentMode({ data: null, error: null }), "free");
});

test("a flag lookup error makes the mode unavailable", () => {
  assert.equal(resolvePaymentMode({ data: null, error: new Error("database unavailable") }), "unavailable");
});

test("an invalid flag value makes the mode unavailable", () => {
  assert.equal(resolvePaymentMode({ data: { value: "enabled" }, error: null }), "unavailable");
});

test("a thrown lookup also makes the mode unavailable", async () => {
  const result = await readPaymentMode(async () => {
    throw new Error("admin client is not configured");
  });
  assert.equal(result.mode, "unavailable");
  assert.ok(result.error instanceof Error);
});
