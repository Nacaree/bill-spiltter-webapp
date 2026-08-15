import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PARTICIPANT_COOKIE_NAME = "bill_participant";
export const PARTICIPANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingKey(secret) {
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32) {
    throw new TypeError("Session secrets must contain at least 32 bytes");
  }
  return secret;
}

function signature(value, secret) {
  return createHmac("sha256", signingKey(secret)).update(value).digest("base64url");
}

function decodePayload(encoded) {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function createParticipantSession({ billId, participantId, secret, now = Date.now() }) {
  if (!UUID.test(billId) || !UUID.test(participantId)) throw new TypeError("Invalid session identity");

  const sessionToken = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(now / 1000);
  const payload = Buffer.from(
    JSON.stringify({ v: 1, billId, participantId, sessionToken, iat: issuedAt, exp: issuedAt + PARTICIPANT_COOKIE_MAX_AGE }),
  ).toString("base64url");

  return { value: `${payload}.${signature(payload, secret)}`, sessionToken };
}

export function verifyParticipantSession(value, { secrets, expectedBillId, now = Date.now() }) {
  if (typeof value !== "string" || !Array.isArray(secrets) || secrets.length === 0) return null;
  const [payload, supplied, extra] = value.split(".");
  if (!payload || !supplied || extra) return null;

  const authentic = secrets.some((secret) => {
    const expected = signature(payload, secret);
    const left = Buffer.from(supplied);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  });
  if (!authentic) return null;

  const session = decodePayload(payload);
  const nowSeconds = Math.floor(now / 1000);
  if (
    session?.v !== 1 ||
    !UUID.test(session.billId) ||
    !UUID.test(session.participantId) ||
    typeof session.sessionToken !== "string" ||
    session.sessionToken.length < 22 ||
    !Number.isSafeInteger(session.iat) ||
    !Number.isSafeInteger(session.exp) ||
    session.iat > nowSeconds + 60 ||
    session.exp <= nowSeconds ||
    (expectedBillId && session.billId !== expectedBillId)
  ) return null;

  return session;
}

export function participantCookie(value, { secure = process.env.NODE_ENV === "production" } = {}) {
  return [
    `${PARTICIPANT_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure && "Secure",
    `Max-Age=${PARTICIPANT_COOKIE_MAX_AGE}`,
  ].filter(Boolean).join("; ");
}
