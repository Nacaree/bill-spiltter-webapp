import { describe, expect, it } from "vitest";
import ocrSpaceFixture from "./fixtures/ocr-space-success.json";
import { parseOcrAmount, parseReceiptText } from "@/lib/receipt-text-parser";

describe("OCR receipt text parsing", () => {
  it("extracts receipt fields and excludes payment lines", () => {
    const parsed = parseReceiptText(
      ocrSpaceFixture.ParsedResults[0].ParsedText,
      "USD",
    );

    expect(parsed).toMatchObject({
      currency: "USD",
      discountMinor: 50,
      merchantName: "NIGHT MARKET",
      provider: "ocr-space",
      receiptDate: "2026-08-16",
      subtotalMinor: 1001,
      taxMinor: 80,
      tipMinor: 119,
      totalMinor: 1150,
    });
    expect(parsed.items).toEqual([
      expect.objectContaining({ description: "Noodles", totalMinor: 501 }),
      expect.objectContaining({
        description: "Drinks",
        quantity: 2,
        totalMinor: 500,
        unitPriceMinor: 250,
      }),
    ]);
  });

  it("handles KHR grouping and European decimal commas", () => {
    expect(parseOcrAmount("៛ 12,000", "KHR")).toBe(12_000);
    expect(parseOcrAmount("EUR 1.234,56", "EUR")).toBe(123_456);
    expect(parseOcrAmount("$1,234.56", "USD")).toBe(123_456);
  });

  it("keeps an incomplete OCR result reviewable", () => {
    const parsed = parseReceiptText(
      "SMALL SHOP\nUnknown item 7.25\nThank you",
      "USD",
    );
    expect(parsed).toMatchObject({
      merchantName: "SMALL SHOP",
      subtotalMinor: 725,
      totalMinor: null,
    });
    expect(parsed.items).toHaveLength(1);
  });
});
