// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  download: vi.fn(),
  extract: vi.fn(),
  normalize: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ download: mocks.download }) },
  }),
}));
vi.mock("@/lib/receipt-extraction", () => ({
  extractReceiptImage: mocks.extract,
  normalizeReceiptExtraction: mocks.normalize,
  ReceiptExtractionError: class extends Error {},
}));
import { processReceiptScan } from "@/server/receipts";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name) => ({
    data:
      name === "claim_receipt_extraction_v3"
        ? [
            {
              claimed: true,
              scan_id: "scan",
              storage_key: "bill/scan",
              mime_type: "image/png",
              bill_currency: "USD",
              attempt_id: "attempt",
            },
          ]
        : true,
  }));
  mocks.download.mockResolvedValue({ data: new Blob(["image"]) });
  mocks.extract.mockResolvedValue({});
  mocks.normalize.mockReturnValue({
    currency: "USD",
    items: [],
    totalMinor: 100,
    taxMinor: 0,
    tipMinor: 0,
    discountMinor: 0,
  });
});
afterEach(() => vi.useRealTimers());
it("stores only the attempt it claimed", async () => {
  expect(await processReceiptScan("scan")).toEqual({
    claimed: true,
    status: "needs_review",
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    "store_receipt_extraction_v2",
    expect.objectContaining({
      expected_attempt_id: "attempt",
      target_scan_id: "scan",
    }),
  );
  expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain(
    "fail_receipt_extraction_v2",
  );
});
it("does not start duplicate extraction when another worker owns the scan", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [] });
  expect(await processReceiptScan("scan")).toEqual({ claimed: false });
  expect(mocks.extract).not.toHaveBeenCalled();
});
it("marks a timed-out attempt failed and prevents its late result from being stored", async () => {
  vi.useFakeTimers();
  let finishProvider;
  mocks.extract.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishProvider = resolve;
      }),
  );
  const work = processReceiptScan("scan");
  await vi.advanceTimersByTimeAsync(90_000);
  expect(await work).toEqual({ claimed: true, status: "failed" });
  expect(mocks.rpc).toHaveBeenCalledWith("fail_receipt_extraction_v2", {
    target_scan_id: "scan",
    expected_attempt_id: "attempt",
    failure_code: "extraction_timed_out",
  });
  finishProvider({});
  await vi.advanceTimersByTimeAsync(1);
  expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain(
    "store_receipt_extraction_v2",
  );
});

it("never downloads or calls Gemini after a quota denial", async () => {
  mocks.rpc.mockResolvedValueOnce({
    data: { claimed: false, rate_limited: true, retry_after_seconds: 600 },
  });
  expect(await processReceiptScan("scan", "actor")).toEqual({
    claimed: false,
    rateLimited: true,
    retryAfterSeconds: 600,
  });
  expect(mocks.rpc).toHaveBeenCalledWith("claim_receipt_extraction_v3", {
    target_scan_id: "scan",
    actor_participant_id: "actor",
  });
  expect(mocks.download).not.toHaveBeenCalled();
  expect(mocks.extract).not.toHaveBeenCalled();
});
it("never calls Gemini when quota storage or its network request fails", async () => {
  for (const fail of [
    () => mocks.rpc.mockResolvedValueOnce({ error: { code: "missing" } }),
    () => mocks.rpc.mockRejectedValueOnce(new Error("network")),
  ]) {
    fail();
    expect(await processReceiptScan("scan")).toEqual({
      claimed: false,
      unavailable: true,
    });
  }
  expect(mocks.extract).not.toHaveBeenCalled();
});
