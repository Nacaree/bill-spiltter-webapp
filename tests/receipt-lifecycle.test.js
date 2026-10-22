// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  billIsActive,
  receiptIsAvailable,
  imageLinkLifetime,
} from "@/lib/bill-lifecycle";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  exists: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    from: mocks.from,
    storage: {
      from: () => ({ exists: mocks.exists, createSignedUrl: mocks.sign }),
    },
  }),
}));
vi.mock("@/server/monitoring", () => ({ reportAppError: vi.fn() }));
import { getReceiptScan, ReceiptNotFoundError } from "@/server/receipts";
let bill, scan;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T00:00:00Z"));
  vi.clearAllMocks();
  bill = {
    id: "bill",
    archived_at: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  scan = {
    id: "scan",
    bill_id: "bill",
    status: "needs_review",
    expires_at: new Date(Date.now() + 20_000).toISOString(),
    storage_key: "bill/scan",
    total_minor: 100,
  };
  mocks.from.mockImplementation((table) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: async () => ({ data: [] }),
    maybeSingle: async () => ({ data: table === "bills" ? bill : scan }),
  }));
  mocks.exists.mockResolvedValue({ data: true });
  mocks.sign.mockResolvedValue({ data: { signedUrl: "private-url" } });
});
afterEach(() => vi.useRealTimers());
it("treats exact deadlines as expired and confirmed expiry as draft-only", () => {
  const now = Date.now();
  expect(billIsActive({ expires_at: new Date(now).toISOString() }, now)).toBe(
    false,
  );
  expect(
    receiptIsAvailable(
      { status: "confirmed", expires_at: new Date(0).toISOString() },
      now,
    ),
  ).toBe(true);
  expect(
    receiptIsAvailable(
      { status: "needs_review", expires_at: new Date(now).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(
    imageLinkLifetime([new Date(now + 10_999).toISOString()], 300, now),
  ).toBe(10);
});
it("caps draft image links at the earlier bill/draft deadline", async () => {
  await getReceiptScan("bill", "scan");
  expect(mocks.sign).toHaveBeenCalledWith("bill/scan", 20);
});
it("keeps confirmed images viewable past their old draft deadline", async () => {
  scan.status = "confirmed";
  scan.expires_at = new Date(0).toISOString();
  expect((await getReceiptScan("bill", "scan")).imageUrl).toBe("private-url");
  expect(mocks.sign).toHaveBeenCalledWith("bill/scan", 60);
});
it("returns a fallback when an older confirmed image has already been removed", async () => {
  scan.status = "confirmed";
  mocks.exists.mockResolvedValue({ data: false });
  const result = await getReceiptScan("bill", "scan");
  expect(result.imageUrl).toBeNull();
  expect(result.total_minor).toBe(100);
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("never signs expired drafts or receipts belonging to expired/deleted bills", async () => {
  scan.expires_at = new Date(Date.now()).toISOString();
  await expect(getReceiptScan("bill", "scan")).rejects.toBeInstanceOf(
    ReceiptNotFoundError,
  );
  expect(mocks.exists).not.toHaveBeenCalled();
  scan.status = "confirmed";
  bill = null;
  await expect(getReceiptScan("bill", "scan")).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("rechecks expiry after slow storage lookups before issuing an image link", async () => {
  mocks.exists.mockImplementation(async () => {
    vi.setSystemTime(new Date(Date.now() + 25_000));
    return { data: true };
  });
  await expect(getReceiptScan("bill", "scan")).rejects.toBeInstanceOf(
    ReceiptNotFoundError,
  );
  expect(mocks.sign).not.toHaveBeenCalled();
});
