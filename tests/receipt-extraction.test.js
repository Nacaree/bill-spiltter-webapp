import { afterEach, describe, expect, it, vi } from "vitest";
import partialFixture from "./fixtures/receipt-partial.json";
import ocrSpaceFixture from "./fixtures/ocr-space-success.json";
import successFixture from "./fixtures/receipt-success.json";
import {
  extractReceiptImage,
  normalizeReceiptExtraction,
  ReceiptExtractionError,
} from "@/lib/receipt-extraction";

describe("receipt extraction fixtures", () => {
  afterEach(() => {
    delete process.env.RECEIPT_EXTRACTION_ENDPOINT;
    delete process.env.RECEIPT_EXTRACTION_API_KEY;
    delete process.env.RECEIPT_EXTRACTION_DEV_FIXTURE;
    delete process.env.OCR_SPACE_API_KEY;
    delete process.env.OCR_SPACE_API_URL;
    vi.unstubAllGlobals();
  });

  it("normalizes a successful structured extraction", () => {
    const draft = normalizeReceiptExtraction(successFixture, "USD");

    expect(draft).toMatchObject({
      currency: "USD",
      merchantName: "Night Market",
      totalMinor: 1200,
    });
    expect(draft.items).toHaveLength(2);
    expect(draft.items.every((item) => !item.needsReview)).toBe(true);
  });

  it("preserves partial values and flags low-confidence fields", () => {
    const draft = normalizeReceiptExtraction(partialFixture, "USD");

    expect(draft.totalMinor).toBeNull();
    expect(draft.items[0]).toMatchObject({
      description: "Review this item",
      needsReview: true,
      totalMinor: 725,
    });
  });

  it("categorizes provider failure and accepts a retried response", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    process.env.OCR_SPACE_API_URL = "https://extract.example.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        json: async () => ocrSpaceFixture,
        ok: true,
        status: 200,
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      extractReceiptImage({
        billCurrency: "USD",
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
        scanId: "scan-1",
      }),
    ).rejects.toMatchObject({ code: "provider_failed" });
    await expect(
      extractReceiptImage({
        billCurrency: "USD",
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
        scanId: "scan-1",
      }),
    ).resolves.toMatchObject({
      merchantName: "NIGHT MARKET",
      provider: "ocr-space",
      totalMinor: 1150,
    });
  });

  it("fails safely when no production provider is configured", async () => {
    await expect(
      extractReceiptImage({
        bytes: new Uint8Array([1]),
        mimeType: "image/png",
        scanId: "scan-2",
      }),
    ).rejects.toBeInstanceOf(ReceiptExtractionError);
  });

  it("provides development-only success and partial fixtures", async () => {
    process.env.RECEIPT_EXTRACTION_DEV_FIXTURE = "success";
    await expect(
      extractReceiptImage({
        bytes: new Uint8Array([1]),
        mimeType: "image/png",
        scanId: "dev",
      }),
    ).resolves.toMatchObject({
      merchantName: "Development fixture",
      totalMinor: 1200,
    });

    process.env.RECEIPT_EXTRACTION_DEV_FIXTURE = "partial";
    await expect(
      extractReceiptImage({
        bytes: new Uint8Array([1]),
        mimeType: "image/png",
        scanId: "dev",
      }),
    ).resolves.toMatchObject({ merchantName: null, totalMinor: null });
  });
});
