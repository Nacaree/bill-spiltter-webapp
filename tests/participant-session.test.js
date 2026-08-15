import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createParticipantSession,
  participantCookie,
  verifyParticipantSession,
} from "../src/lib/participant-session.js";

const billId = "018f0f67-2a03-7e9d-8e1c-75dcfcb18be7";
const participantId = "018f0f67-4d58-7ee1-8cc8-b24c75e64a42";
const otherBillId = "018f0f67-84dd-7915-99db-f02d13a65f8a";
const currentSecret = "current-session-secret-that-is-long-enough";
const oldSecret = "previous-session-secret-that-is-long-enough";
const now = Date.UTC(2026, 7, 15);

test("round trips a scoped participant session", () => {
  const created = createParticipantSession({ billId, participantId, secret: currentSecret, now });
  const session = verifyParticipantSession(created.value, { secrets: [currentSecret], expectedBillId: billId, now });
  assert.equal(session.billId, billId);
  assert.equal(session.participantId, participantId);
  assert.equal(session.sessionToken, created.sessionToken);
  assert.equal(verifyParticipantSession(created.value, { secrets: [currentSecret], expectedBillId: otherBillId, now }), null);
});

test("rejects tampered and expired sessions", () => {
  const created = createParticipantSession({ billId, participantId, secret: currentSecret, now });
  assert.equal(verifyParticipantSession(`${created.value}x`, { secrets: [currentSecret], now }), null);
  assert.equal(verifyParticipantSession(created.value, { secrets: [currentSecret], now: now + 366 * 24 * 60 * 60 * 1000 }), null);
});

test("accepts an old signing key during rotation", () => {
  const created = createParticipantSession({ billId, participantId, secret: oldSecret, now });
  assert.ok(verifyParticipantSession(created.value, { secrets: [currentSecret, oldSecret], now }));
});

test("sets defensive participant cookie attributes", () => {
  const cookie = participantCookie("signed-value", { secure: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=31536000/);
});
