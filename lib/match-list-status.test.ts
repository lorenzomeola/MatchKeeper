import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingListStatus, keeperMatchTab, matchListStatus } from "./match-list-status.ts";

test("played and cancelled matches do not retain a booked history badge", () => {
  assert.equal(matchListStatus("completed", ["completed"]).label, "Played");
  assert.equal(matchListStatus("cancelled", ["cancelled"]).label, "Cancelled");
});

test("a reported booking is visible as under review, including a two-keeper match", () => {
  assert.equal(matchListStatus("assigned", ["completed", "under_review"]).label, "Under review");
  assert.equal(matchListStatus("assigned", ["confirmed", "under_review"]).tone, "warning");
});

test("an open match is still open after one keeper cancels", () => {
  assert.equal(matchListStatus("open", ["cancelled"]).label, "Open");
  assert.equal(matchListStatus("open", ["confirmed"]).label, "Open");
});

test("active assigned matches remain booked", () => {
  assert.equal(matchListStatus("assigned", ["confirmed"]).label, "Booked");
});

test("keeper history uses their own booking, not another keeper's outcome", () => {
  assert.equal(bookingListStatus("completed")?.label, "Played");
  assert.equal(bookingListStatus("cancelled")?.label, "Cancelled");
  assert.equal(bookingListStatus("under_review")?.label, "Under review");
  assert.equal(bookingListStatus("confirmed")?.label, "Booked");
  assert.equal(bookingListStatus(null), null);
  assert.equal(bookingListStatus("unknown"), null);
});

test("a booking completed before full time is past, never still booked", () => {
  assert.equal(keeperMatchTab({ applicationStatus: "accepted", matchStatus: "completed", bookingStatus: "completed", ended: false }), "past");
});

test("a cancelled or reviewed booking moves to past even if another keeper remains booked", () => {
  for (const bookingStatus of ["cancelled", "under_review"]) {
    assert.equal(keeperMatchTab({ applicationStatus: "accepted", matchStatus: "assigned", bookingStatus, ended: false }), "past");
  }
});

test("waiting applications and active bookings preserve their tabs", () => {
  assert.equal(keeperMatchTab({ applicationStatus: "pending", matchStatus: "open", bookingStatus: null, ended: false }), "open");
  assert.equal(keeperMatchTab({ applicationStatus: "accepted", matchStatus: "assigned", bookingStatus: "confirmed", ended: false }), "booked");
  assert.equal(keeperMatchTab({ applicationStatus: "pending", matchStatus: "open", bookingStatus: null, ended: true }), "past");
  assert.equal(keeperMatchTab({ applicationStatus: "withdrawn", matchStatus: "open", bookingStatus: null, ended: false }), "past");
});
