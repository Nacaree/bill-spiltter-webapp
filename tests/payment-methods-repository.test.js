// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  sign: vi.fn(),
  bill: vi.fn(),
  ledger: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: () => ({ createSignedUrl: mocks.sign }) },
  }),
}));
vi.mock("@/server/bills", () => ({
  getBillByShareToken: mocks.bill,
  getSessionParticipant: vi.fn(),
  ParticipantSessionRequiredError: class extends Error {},
  BillNotFoundError: class extends Error {},
}));
vi.mock("@/server/settlements", () => ({
  getBillLedger: mocks.ledger,
  phaseThreeError: () => new Error(),
  settlementAccess: vi.fn(),
  SettlementValidationError: class extends Error {},
}));
import { openOwnerQr } from "@/server/payment-methods";

const transfer = {
  fromParticipantId: "guest",
  toParticipantId: "owner",
  amountMinor: 500,
};
let method;
let query;
beforeEach(() => {
  vi.clearAllMocks();
  method = {
    id: "method",
    owner_participant_id: "owner",
    recipient_label: "Test Owner",
    supported_currencies: ["USD"],
    fixed_amount_minor: null,
    expires_at: null,
    updated_at: "version",
  };
  query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  mocks.from.mockReturnValue(query);
  query.maybeSingle
    .mockImplementationOnce(async () => ({ data: method }))
    .mockResolvedValue({ data: { qr_storage_key: "bill/qr.png" } });
  mocks.bill.mockResolvedValue({ id: "bill", currency: "USD" });
  mocks.ledger.mockResolvedValue({ transfers: [transfer] });
  mocks.sign.mockResolvedValue({
    data: { signedUrl: "https://private.example/signed" },
  });
});

it("opening a QR only creates short-lived view/download URLs and never writes a payment", async () => {
  const opened = await openOwnerQr({ shareToken: "private", ...transfer });
  expect(opened).toMatchObject({
    recipientLabel: "Test Owner",
    currency: "USD",
    amountMinor: 500,
  });
  expect(mocks.sign).toHaveBeenNthCalledWith(1, "bill/qr.png", 60);
  expect(mocks.sign).toHaveBeenNthCalledWith(2, "bill/qr.png", 60, {
    download: "aba-qr.png",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(query.eq).toHaveBeenCalledWith("updated_at", "version");
});
it("rejects non-owner transfers and stale amounts before signing any image", async () => {
  await expect(
    openOwnerQr({ shareToken: "private", ...transfer, amountMinor: 600 }),
  ).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("rejects fixed-amount mismatches and expired QR codes before signing", async () => {
  method.fixed_amount_minor = 600;
  await expect(
    openOwnerQr({ shareToken: "private", ...transfer }),
  ).rejects.toThrow();
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("does not let signed access outlive the dynamic QR expiry", async () => {
  method.expires_at = new Date(Date.now() + 20_000).toISOString();
  await openOwnerQr({ shareToken: "private", ...transfer });
  expect(mocks.sign.mock.calls[0][1]).toBeGreaterThan(0);
  expect(mocks.sign.mock.calls[0][1]).toBeLessThanOrEqual(20);
});
