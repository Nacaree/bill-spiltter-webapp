import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/** Create a 256-bit, URL-safe capability and the digest safe to persist. */
export function createAccessToken() {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashAccessToken(token) };
}

/** Hash a raw capability before comparing it with a persisted digest. */
export function hashAccessToken(token) {
  if (typeof token !== "string" || token.length < 22) {
    throw new TypeError("Access token is missing or too short");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Generate independent share and creator-recovery capabilities. */
export function createBillAccess() {
  return {
    share: createAccessToken(),
    creator: createAccessToken(),
  };
}
