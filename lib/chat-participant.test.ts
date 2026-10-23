import assert from "node:assert/strict";
import { test } from "node:test";
import { isChatParticipant } from "./chat-participant.ts";

const application = { goalkeeper_id: "keeper", matches: { created_by: "player" } };

test("chat admits the match owner and applicant", () => {
  assert.equal(isChatParticipant(application, "player"), true);
  assert.equal(isChatParticipant(application, "keeper"), true);
});

test("moderation visibility does not make an admin a personal chat participant", () => {
  assert.equal(isChatParticipant(application, "admin"), false);
});

test("chat requires a visible match even for the applicant", () => {
  assert.equal(isChatParticipant({ ...application, matches: null }, "keeper"), false);
});
