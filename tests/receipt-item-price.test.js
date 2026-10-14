import { describe, expect, it } from "vitest";
import {
  parseReceiptQuantity,
  receiptLineTotal,
} from "@/lib/receipt-item-price";

describe("Receipt unit prices", () => {
  it("multiplies prices by integer and fractional quantities in minor units", () => {
    expect(receiptLineTotal(350, 3)).toBe(1050);
    expect(receiptLineTotal(300, "0.333")).toBe(100);
    expect(receiptLineTotal(301, "0.500")).toBe(151);
    expect(parseReceiptQuantity("3.000")).toBe(3);
  });
  it.each(["0", "-1", "1001", "0.0001", "abc", "Infinity"])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(() => receiptLineTotal(100, quantity)).toThrow();
    },
  );
  it("rejects unsafe totals rather than losing cents", () => {
    expect(() => receiptLineTotal(Number.MAX_SAFE_INTEGER, 2)).toThrow(
      "too large",
    );
  });
});
