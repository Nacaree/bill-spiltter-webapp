import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import sharp from "sharp";
import partialFixture from "./fixtures/receipt-partial.json";
import successFixture from "./fixtures/receipt-success.json";
import {
  extractReceiptImage,
  normalizeReceiptExtraction,
} from "@/lib/receipt-extraction";

let image;
function geminiDraft(fixture = successFixture) {
  return {
    ...fixture,
    items: fixture.items.map(
      ({ description, quantity, unitPriceMinor, totalMinor }) => ({
        description,
        quantity,
        unitPriceMinor,
        totalMinor,
      }),
    ),
  };
}
function payload(draft = geminiDraft(), finishReason = "STOP") {
  return {
    responseId: "response-1",
    candidates: [
      { finishReason, content: { parts: [{ text: JSON.stringify(draft) }] } },
    ],
  };
}
function mockResponse(body = payload()) {
  return { ok: true, json: async () => body };
}
function extract() {
  return extractReceiptImage({
    billCurrency: "USD",
    bytes: image,
    mimeType: "image/png",
  });
}

describe("Gemini receipt extraction", () => {
  beforeAll(async () => {
    image = await sharp({
      create: { width: 12, height: 12, channels: 3, background: "white" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: "Private sample metadata" } } })
      .toBuffer();
  });
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_RECEIPT_MODEL", "");
    vi.stubEnv("RECEIPT_EXTRACTION_DEV_FIXTURE", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes existing structured fixtures", () => {
    const draft = normalizeReceiptExtraction(successFixture, "USD");
    expect(draft).toMatchObject({
      currency: "USD",
      merchantName: "Night Market",
      totalMinor: 1200,
    });
    expect(draft.items.every((item) => !item.needsReview)).toBe(true);
    expect(
      normalizeReceiptExtraction(partialFixture, "USD").items[0],
    ).toMatchObject({
      description: "Review this item",
      needsReview: true,
      totalMinor: 725,
    });
  });
  it("sends a metadata-free image and JSON schema and keeps AI items flagged for review", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse());
    vi.stubGlobal("fetch", fetchMock);
    const draft = normalizeReceiptExtraction(await extract(), "USD");
    expect(draft).toMatchObject({
      provider: "gemini",
      providerRequestId: "response-1",
      totalMinor: 1200,
    });
    expect(
      draft.items.every(
        (item) => item.needsReview && item.confidenceBasisPoints === null,
      ),
    ).toBe(true);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    );
    expect(request.headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(request.body);
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object" },
    });
    expect(
      body.generationConfig.responseJsonSchema.properties.items.items
        .properties,
    ).not.toHaveProperty("confidenceBasisPoints");
    const sentImage = body.contents[0].parts[0].inlineData;
    expect(sentImage.mimeType).toBe("image/jpeg");
    expect((await sharp(image).metadata()).exif).toBeDefined();
    const metadata = await sharp(
      Buffer.from(sentImage.data, "base64"),
    ).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.exif).toBeUndefined();
  });
  it("supports an explicitly selected model", async () => {
    vi.stubEnv("GEMINI_RECEIPT_MODEL", "gemini-3.8-flash");
    const fetchMock = vi.fn().mockResolvedValue(mockResponse());
    vi.stubGlobal("fetch", fetchMock);
    await extract();
    expect(fetchMock.mock.calls[0][0]).toContain(
      "models/gemini-3.8-flash:generateContent",
    );
  });
  it.each([
    [401, "provider_auth_failed"],
    [403, "provider_auth_failed"],
    [404, "provider_model_unavailable"],
    [429, "provider_rate_limited"],
  ])("classifies HTTP %s as %s", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    await expect(extract()).rejects.toMatchObject({ code });
  });
  it("categorizes provider failure and accepts a retried response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce(mockResponse()),
    );
    await expect(extract()).rejects.toMatchObject({ code: "provider_failed" });
    await expect(extract()).resolves.toMatchObject({
      merchantName: "Night Market",
      provider: "gemini",
      totalMinor: 1200,
    });
  });
  it("preserves incomplete AI values without inventing names", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(mockResponse(payload(geminiDraft(partialFixture)))),
    );
    const draft = normalizeReceiptExtraction(await extract(), "USD");
    expect(draft.totalMinor).toBeNull();
    expect(draft.items[0]).toMatchObject({
      description: "Review this item",
      totalMinor: 725,
      needsReview: true,
    });
  });
  it("rejects malformed HTTP response JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("private response body");
        },
      }),
    );
    await expect(extract()).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
  });
  it.each([
    "not json",
    JSON.stringify({ ...geminiDraft(), totalMinor: "1200" }),
    JSON.stringify({ ...geminiDraft(), items: [{ totalMinor: -1 }] }),
  ])("rejects an invalid extracted payload", async (text) => {
    const body = payload();
    body.candidates[0].content.parts = [{ text }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(body)));
    await expect(extract()).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
  });
  it.each(["MAX_TOKENS", "SAFETY"])(
    "rejects a %s completion even with valid JSON",
    async (finishReason) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            mockResponse(payload(geminiDraft(), finishReason)),
          ),
      );
      await expect(extract()).rejects.toMatchObject({
        code: "provider_failed",
      });
    },
  );
  it("rejects blocked requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResponse({ promptFeedback: { blockReason: "SAFETY" } }),
        ),
    );
    await expect(extract()).rejects.toMatchObject({ code: "provider_failed" });
  });
  it("ignores thought parts when parsing the final receipt", async () => {
    const body = payload();
    body.candidates[0].content.parts.unshift({
      thought: true,
      text: "internal reasoning",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(body)));
    await expect(extract()).resolves.toMatchObject({ totalMinor: 1200 });
  });
  it("fails safely when the Gemini key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(extract()).rejects.toMatchObject({
      code: "provider_not_configured",
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects corrupt images without forwarding raw bytes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      extractReceiptImage({
        billCurrency: "USD",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({ code: "image_conversion_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("categorizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(extract()).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });
  it("provides development fixtures without calling Gemini", async () => {
    vi.stubEnv("RECEIPT_EXTRACTION_DEV_FIXTURE", "success");
    await expect(extract()).resolves.toMatchObject({
      provider: "development-fixture",
      totalMinor: 1200,
    });
    vi.stubEnv("RECEIPT_EXTRACTION_DEV_FIXTURE", "partial");
    await expect(extract()).resolves.toMatchObject({
      merchantName: null,
      totalMinor: null,
    });
  });
  it("ignores development fixtures in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECEIPT_EXTRACTION_DEV_FIXTURE", "success");
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(extract()).rejects.toMatchObject({
      code: "provider_not_configured",
    });
  });
});
