import { expect, test } from "vitest";
import {
  createAccessToken,
  createBillAccess,
  hashAccessToken,
} from "../src/lib/access-tokens.js";

test("creates URL-safe, independently random bill capabilities", () => {
  const { share, creator } = createBillAccess();
  expect(share.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(share.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  expect(hashAccessToken(share.token)).toBe(share.tokenHash);
  expect(share.token).not.toBe(creator.token);
  expect(share.tokenHash).not.toBe(creator.tokenHash);
});

test("rejects weak access token input", () => {
  expect(() => hashAccessToken("guessable")).toThrow(/too short/);
  expect(createAccessToken().token).toHaveLength(43);
});
