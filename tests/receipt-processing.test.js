// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  receiptCanRetry,
  withExtractionDeadline,
} from "@/lib/receipt-processing";
afterEach(() => vi.useRealTimers());
it("offers stale retry at 150 seconds, but not for fresh, confirmed, or expired scans", () => {
  const now = Date.now();
  const old = new Date(now - 150_001).toISOString();
  expect(receiptCanRetry({ status: "uploaded", created_at: old }, now)).toBe(
    true,
  );
  expect(
    receiptCanRetry({ status: "processing", processing_started_at: old }, now),
  ).toBe(true);
  expect(
    receiptCanRetry(
      {
        status: "processing",
        processing_started_at: new Date(now).toISOString(),
      },
      now,
    ),
  ).toBe(false);
  expect(receiptCanRetry({ status: "confirmed", updated_at: old }, now)).toBe(
    false,
  );
  expect(receiptCanRetry({ status: "failed", expires_at: old }, now)).toBe(
    false,
  );
  expect(receiptCanRetry({ status: "failed" }, now)).toBe(true);
});
it("aborts the overall attempt at its deadline, including a hung operation", async () => {
  vi.useFakeTimers();
  let signal;
  const attempt = withExtractionDeadline((value) => {
    signal = value;
    return new Promise(() => {});
  }, 90_000);
  const rejected = expect(attempt).rejects.toHaveProperty(
    "name",
    "TimeoutError",
  );
  await vi.advanceTimersByTimeAsync(90_000);
  await rejected;
  expect(signal.aborted).toBe(true);
});
it("clears its timer after successful completion", async () => {
  vi.useFakeTimers();
  expect(await withExtractionDeadline(async () => "done")).toBe("done");
  expect(vi.getTimerCount()).toBe(0);
});
it("waits for the persisted application quota delay before permitting receipt retries", () => {
  const now = Date.now();
  expect(
    receiptCanRetry(
      { status: "failed", next_retry_at: new Date(now + 60_000).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(
    receiptCanRetry(
      { status: "failed", next_retry_at: new Date(now).toISOString() },
      now,
    ),
  ).toBe(true);
});
