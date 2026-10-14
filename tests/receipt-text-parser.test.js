import { describe, expect, it } from "vitest";
import ocrSpaceFixture from "./fixtures/ocr-space-success.json";
import layouts from "./fixtures/receipt-text-layouts.json";
import cambodiaReceipt from "./fixtures/cambodia-receipt-visual-transcription.json";
import { parseOcrAmount, parseReceiptText } from "@/lib/receipt-text-parser";

describe("OCR receipt text parsing", () => {
  it("parses the visible Cambodian receipt amounts and excludes the riel total from USD", () => {
    const parsed = parseReceiptText(
      cambodiaReceipt.text,
      cambodiaReceipt.billCurrency,
    );
    expect(parsed).toMatchObject(cambodiaReceipt.expected);
    expect(parsed.items).toHaveLength(cambodiaReceipt.expectedItemCount);
    expect(parsed.items.map((item) => item.totalMinor)).toEqual(
      cambodiaReceipt.expectedItemTotalsMinor,
    );
    expect(parsed.items.reduce((sum, item) => sum + item.totalMinor, 0)).toBe(
      parsed.subtotalMinor,
    );
  });

  it("recognizes the Cambodian R marker as riel when the bill uses KHR", () => {
    expect(
      parseReceiptText(
        "Restaurant\nGrand Total ($) 125.75\nGrand Total (R) 521,900",
        "KHR",
      ),
    ).toMatchObject({ currency: "KHR", totalMinor: 521900 });
  });

  it.each(layouts)(
    "parses $name",
    ({ billCurrency, text, expected, items }) => {
      const parsed = parseReceiptText(text, billCurrency);
      expect(parsed).toMatchObject(expected);
      expect(parsed.items).toEqual(
        items.map((item) => expect.objectContaining(item)),
      );
    },
  );

  it.each([
    "1.2345",
    "12,34,567",
    "1.234.56",
    "1..00",
    "12-34",
    "(12.00",
    "9007199254740992",
  ])("rejects malformed or unsafe USD amount %s", (amount) =>
    expect(parseOcrAmount(amount, "USD")).toBeNull(),
  );

  it.each([
    ["1,234,567.89", "USD", 123456789],
    ["1.234.567,89", "EUR", 123456789],
    ["(0.50) USD", "USD", -50],
    ["41,000.00 KHR", "KHR", 41000],
    ["៛ 41.000", "KHR", 41000],
  ])("reads %s as minor units", (amount, currency, expected) => {
    expect(parseOcrAmount(amount, currency)).toBe(expected);
  });

  it("uses the bill currency for dual-currency receipts", () => {
    const text = "SHOP\nRice 10,000 KHR\nTOTAL USD 2.50\nTOTAL KHR 10,000";
    expect(parseReceiptText(text, "KHR")).toMatchObject({
      currency: "KHR",
      totalMinor: 10000,
    });
    expect(parseReceiptText(text, "USD")).toMatchObject({
      currency: "USD",
      totalMinor: 250,
      items: [],
    });
  });

  it("still detects a receipt currency different from the bill", () => {
    expect(
      parseReceiptText("SHOP\nRice 10,000 KHR\nTOTAL KHR 10,000", "USD"),
    ).toMatchObject({ currency: "KHR", totalMinor: 10000 });
  });

  it("flags inconsistent quantity and unit prices without changing the printed total", () => {
    const parsed = parseReceiptText(
      "CAFE\n2 x Coffee 2.00 5.00\nTOTAL 5.00",
      "USD",
    );
    expect(parsed.items[0]).toMatchObject({
      description: "Coffee",
      quantity: 2,
      totalMinor: 500,
      unitPriceMinor: null,
      confidenceBasisPoints: 4000,
    });
  });

  it("reads quantities printed after an item name", () => {
    const parsed = parseReceiptText(
      "CAFE\nCoffee 2 @ 2.50 5.00\nTOTAL 5.00",
      "USD",
    );
    expect(parsed.items).toEqual([
      expect.objectContaining({
        description: "Coffee",
        quantity: 2,
        unitPriceMinor: 250,
        totalMinor: 500,
      }),
    ]);
  });

  it("uses the last valid total when repeated labels have equal priority", () => {
    expect(
      parseReceiptText(
        "CAFE\nTea 2.00\nTotal 1.00\nTotal 2.00\nTotal unreadable",
        "USD",
      ).totalMinor,
    ).toBe(200);
  });

  it("combines tax components but does not double-count a total-tax row", () => {
    const text = "CAFE\nMeal 10.00\nVAT 0.50\nTax 0.25";
    expect(parseReceiptText(text, "USD").taxMinor).toBe(75);
    expect(
      parseReceiptText(`${text}\nTotal tax 0.75\nTOTAL 10.75`, "USD"),
    ).toMatchObject({ taxMinor: 75, totalMinor: 1075 });
  });

  it("does not turn included tax, rates, IDs, or phone numbers into extra charges", () => {
    const parsed = parseReceiptText(
      "CAFE\nPhone 012345678\nOrder # 345\nTable 12\nTea 2.00\nVAT included 0.20\nTax 10%\nTOTAL 2.00",
      "USD",
    );
    expect(parsed.items).toHaveLength(1);
    expect(parsed).toMatchObject({
      merchantName: "CAFE",
      taxMinor: 0,
      totalMinor: 200,
    });
  });

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
