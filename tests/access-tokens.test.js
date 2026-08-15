import assert from "node:assert/strict";
import { test } from "node:test";
import { createAccessToken, createBillAccess, hashAccessToken } from "../src/lib/access-tokens.js";

test("creates URL-safe, independently random bill capabilities", () => {
  const { share, creator } = createBillAccess();
  assert.match(share.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(share.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(hashAccessToken(share.token), share.tokenHash);
  assert.notEqual(share.token, creator.token);
  assert.notEqual(share.tokenHash, creator.tokenHash);
});

test("rejects weak access token input", () => {
  assert.throws(() => hashAccessToken("guessable"), /too short/);
  assert.equal(createAccessToken().token.length, 43);
});
