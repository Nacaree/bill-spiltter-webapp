import { expect, test } from "vitest";
import {
  createParticipantSession,
  PARTICIPANT_COOKIE_MAX_AGE,
  participantCookie,
  participantCookieOptions,
  verifyParticipantSession,
} from "../src/lib/participant-session.js";

const billId = "018f0f67-2a03-7e9d-8e1c-75dcfcb18be7";
const participantId = "018f0f67-4d58-7ee1-8cc8-b24c75e64a42";
const otherBillId = "018f0f67-84dd-7915-99db-f02d13a65f8a";
const currentSecret = "current-session-secret-that-is-long-enough";
const oldSecret = "previous-session-secret-that-is-long-enough";
const now = Date.UTC(2026, 7, 15);

test("round trips a scoped participant session", () => {
  const created = createParticipantSession({
    billId,
    participantId,
    secret: currentSecret,
    now,
  });
  const session = verifyParticipantSession(created.value, {
    secrets: [currentSecret],
    expectedBillId: billId,
    now,
  });
  expect(session.billId).toBe(billId);
  expect(session.participantId).toBe(participantId);
  expect(session.sessionToken).toBe(created.sessionToken);
  expect(
    verifyParticipantSession(created.value, {
      secrets: [currentSecret],
      expectedBillId: otherBillId,
      now,
    }),
  ).toBeNull();
});

test("rejects tampered and expired sessions", () => {
  const created = createParticipantSession({
    billId,
    participantId,
    secret: currentSecret,
    now,
  });
  expect(
    verifyParticipantSession(`${created.value}x`, {
      secrets: [currentSecret],
      now,
    }),
  ).toBeNull();
  expect(
    verifyParticipantSession(created.value, {
      secrets: [currentSecret],
      now: now + 366 * 24 * 60 * 60 * 1000,
    }),
  ).toBeNull();
});

test("accepts an old signing key during rotation", () => {
  const created = createParticipantSession({
    billId,
    participantId,
    secret: oldSecret,
    now,
  });
  expect(
    verifyParticipantSession(created.value, {
      secrets: [currentSecret, oldSecret],
      now,
    }),
  ).not.toBeNull();
});

test("rehearses old, bridge, cutover and retirement deployments", () => {
  const issue = (secret) =>
    createParticipantSession({ billId, participantId, secret, now }).value;
  const oldCookie = issue(oldSecret);
  const newCookie = issue(currentSecret);
  const deployments = [
    { keys: [oldSecret], accepted: [true, false] },
    { keys: [oldSecret, currentSecret], accepted: [true, true] },
    { keys: [currentSecret, oldSecret], accepted: [true, true] },
    { keys: [currentSecret], accepted: [false, true] },
  ];
  for (const { keys, accepted } of deployments) {
    for (const [index, cookie] of [oldCookie, newCookie].entries()) {
      const options = { secrets: keys, expectedBillId: billId, now };
      expect(Boolean(verifyParticipantSession(cookie, options))).toBe(
        accepted[index],
      );
      expect(verifyParticipantSession(`${cookie}x`, options)).toBeNull();
      expect(
        verifyParticipantSession(cookie, {
          ...options,
          expectedBillId: otherBillId,
        }),
      ).toBeNull();
    }
  }
});

test("retains the original 365-day deadline during overlap without renewing it", () => {
  const { value } = createParticipantSession({
    billId,
    participantId,
    secret: oldSecret,
    now,
  });
  const options = {
    secrets: [currentSecret, oldSecret],
    expectedBillId: billId,
  };
  const deadline = now + PARTICIPANT_COOKIE_MAX_AGE * 1000;
  const before = verifyParticipantSession(value, {
    ...options,
    now: deadline - 1,
  });
  expect(before.exp * 1000).toBe(deadline);
  expect(
    verifyParticipantSession(value, { ...options, now: deadline }),
  ).toBeNull();
});

test("can sign a pre-generated token for an atomic database insert", () => {
  const sessionToken = "a".repeat(43);
  const created = createParticipantSession({
    billId,
    participantId,
    secret: currentSecret,
    sessionToken,
    now,
  });
  expect(created.sessionToken).toBe(sessionToken);
});

test("sets defensive participant cookie attributes", () => {
  const cookie = participantCookie("signed-value", { secure: true });
  expect(cookie).toMatch(/HttpOnly/);
  expect(cookie).toMatch(/SameSite=Lax/);
  expect(cookie).toMatch(/Secure/);
  expect(cookie).toMatch(/Max-Age=31536000/);
  expect(participantCookieOptions({ path: "/b/private" })).toMatchObject({
    httpOnly: true,
    path: "/b/private",
    sameSite: "lax",
  });
});
