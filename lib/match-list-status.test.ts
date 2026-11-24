import assert from "node:assert/strict";
import { test } from "node:test";
import { relativeDay } from "./format.ts";
import { adminMatchStatus, bookingListStatus, groupByMonth, keeperMatchTab, matchListStatus } from "./match-list-status.ts";

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

const NOW = new Date("2026-11-24T12:00:00Z");

test("admin: a match that ended without a keeper is not still open", () => {
  assert.equal(adminMatchStatus("open", "2026-11-20T11:00:00Z", NOW).label, "No keeper");
  assert.equal(adminMatchStatus("open", "2026-11-29T12:30:00Z", NOW).label, "Needs a keeper");
  assert.equal(adminMatchStatus("assigned", "2026-11-29T12:30:00Z", NOW).label, "Booked");
  assert.equal(adminMatchStatus("assigned", "2026-11-20T11:00:00Z", NOW).label, "Played");
  assert.equal(adminMatchStatus("completed", "2026-11-20T11:00:00Z", NOW).label, "Played");
  assert.equal(adminMatchStatus("cancelled", "2026-11-29T12:30:00Z", NOW).label, "Cancelled");
  assert.equal(adminMatchStatus("open", "2026-11-20T11:00:00Z", NOW).past, true);
  assert.equal(adminMatchStatus("open", "2026-11-24T12:30:00Z", NOW).past, false);
});

test("admin: matches grouped by London month and year, keeping their order", () => {
  const groups = groupByMonth([
    { starts_at: "2026-11-29T10:30:00Z" },
    { starts_at: "2026-11-02T10:30:00Z" },
    { starts_at: "2026-10-31T23:30:00Z" },
    { starts_at: "2025-12-01T10:00:00Z" },
  ]);
  assert.deepEqual(groups.map((g) => [g.label, g.rows.length]), [["November 2026", 2], ["October 2026", 1], ["December 2025", 1]]);
});

test("relative day in London calendar days", () => {
  assert.equal(relativeDay("2026-11-24T20:00:00Z", NOW), "Today");
  assert.equal(relativeDay("2026-11-25T09:00:00Z", NOW), "Tomorrow");
  assert.equal(relativeDay("2026-11-23T09:00:00Z", NOW), "Yesterday");
  assert.equal(relativeDay("2026-11-29T10:30:00Z", NOW), "In 5 days");
  assert.equal(relativeDay("2026-11-20T10:30:00Z", NOW), "4 days ago");
});
