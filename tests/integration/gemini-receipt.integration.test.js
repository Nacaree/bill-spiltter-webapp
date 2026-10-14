// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  extractReceiptImage,
  normalizeReceiptExtraction,
} from "@/lib/receipt-extraction";

const liveDescribe =
  process.env.RUN_GEMINI_INTEGRATION === "1" ? describe : describe.skip;

liveDescribe("Gemini live receipt extraction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("reads a generated dual-currency receipt into a reviewable USD draft", async () => {
    // Synthetic data only: no customer receipts, payment codes or credentials.
    vi.stubEnv("RECEIPT_EXTRACTION_DEV_FIXTURE", "");
    const lines = [
      "SAMPLE CAFE",
      "2026-08-16",
      "Item         Qty   Price   Amount",
      "Noodles      2     3.50    7.00",
      "Drinks       1     2.00    2.00",
      "Subtotal                  9.00",
      "Discount                  1.00",
      "Grand Total USD           8.00",
      "Grand Total KHR          32,800",
    ];
    const svg = `<svg width="900" height="650" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><g font-family="monospace" font-size="34" fill="black">${lines.map((line, i) => `<text x="45" y="${65 + i * 60}">${line}</text>`).join("")}</g></svg>`;
    const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
    const raw = await extractReceiptImage({
      billCurrency: "USD",
      bytes,
      mimeType: "image/png",
    });
    const draft = normalizeReceiptExtraction(raw, "USD");
    expect(draft).toMatchObject({
      currency: "USD",
      provider: "gemini",
      merchantName: "SAMPLE CAFE",
      subtotalMinor: 900,
      discountMinor: 100,
      totalMinor: 800,
    });
    expect(
      draft.items.map(({ quantity, totalMinor, unitPriceMinor }) => ({
        quantity,
        totalMinor,
        unitPriceMinor,
      })),
    ).toEqual([
      { quantity: 2, totalMinor: 700, unitPriceMinor: 350 },
      { quantity: 1, totalMinor: 200, unitPriceMinor: 200 },
    ]);
    expect(draft.items.every((item) => item.needsReview)).toBe(true);
  }, 75_000);
});
