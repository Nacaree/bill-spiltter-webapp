import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  formatMoney,
  parseMoneyToMinor,
  splitEqually,
  validateExactShares,
} from "@/lib/money";

describe("money parsing and formatting", () => {
  it.each([
    ["12", "USD", 1200],
    ["12.3", "USD", 1230],
    ["12.34", "USD", 1234],
    ["4000", "KHR", 4000],
  ])("parses %s %s into integer minor units", (input, currency, expected) => {
    expect(parseMoneyToMinor(input, currency)).toBe(expected);
  });

  it("rejects ambiguous, over-precise, zero, and unsafe amounts", () => {
    expect(() => parseMoneyToMinor("1,000", "USD")).toThrow(/valid/);
    expect(() => parseMoneyToMinor("1.001", "USD")).toThrow(/valid/);
    expect(() => parseMoneyToMinor("10.5", "KHR")).toThrow(/valid/);
    expect(() => parseMoneyToMinor("0", "USD")).toThrow(/positive/);
    expect(() => parseMoneyToMinor("999999999999999999", "USD")).toThrow(
      /large/,
    );
  });

  it("uses explicit currency precision and stable formatting", () => {
    expect(currencyFractionDigits("KHR")).toBe(0);
    expect(formatMoney(1234, "USD")).toBe("$12.34");
    expect(formatMoney(4000, "KHR")).toContain("4,000");
  });

  it.each(["EUR", "GBP"])("rejects unsupported currency %s", (currency) => {
    expect(() => parseMoneyToMinor("12.34", currency)).toThrow(/Unsupported/);
    expect(() => formatMoney(1234, currency)).toThrow(/Unsupported/);
  });
});

describe("expense shares", () => {
  it("allocates indivisible equal shares deterministically", () => {
    expect(splitEqually(1000, ["a", "b", "c"])).toEqual([
      { participantId: "a", amountMinor: 334 },
      { participantId: "b", amountMinor: 333 },
      { participantId: "c", amountMinor: 333 },
    ]);
  });

  it("preserves tiny totals without losing a minor unit", () => {
    expect(splitEqually(1, ["a", "b", "c"])).toEqual([
      { participantId: "a", amountMinor: 1 },
      { participantId: "b", amountMinor: 0 },
      { participantId: "c", amountMinor: 0 },
    ]);
  });

  it("accepts exact shares only when IDs are unique and totals match", () => {
    const shares = [
      { participantId: "a", amountMinor: 600 },
      { participantId: "b", amountMinor: 400 },
    ];
    expect(validateExactShares(1000, shares)).toBe(shares);
    expect(() => validateExactShares(999, shares)).toThrow(/match/);
    expect(() =>
      validateExactShares(1000, [
        { participantId: "a", amountMinor: 600 },
        { participantId: "a", amountMinor: 400 },
      ]),
    ).toThrow(/unique/);
  });
});
