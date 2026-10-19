// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signQrPreview } from "@/lib/payment-qr";

const mocks = vi.hoisted(() => ({
  bill: vi.fn(),
  actor: vi.fn(),
  inspect: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  }),
}));
vi.mock("@/server/bills", () => ({
  getBillByShareToken: mocks.bill,
  getSessionParticipant: mocks.actor,
}));
vi.mock("@/lib/payment-qr", async (original) => ({
  ...(await original()),
  inspectPaymentQr: mocks.inspect,
}));
vi.mock("@/server/settlements", () => ({
  settlementAccess: () => ({
    share_hash: "hash",
    actor_participant_id: "owner",
    actor_session_hash: "session-hash",
  }),
  phaseThreeError: (error) => new Error(error.message),
  getBillLedger: vi.fn(),
  SettlementValidationError: class extends Error {},
}));
import { previewOwnerQr, saveOwnerQr } from "@/server/payment-methods";

const secret = "phase-3-dual-currency-test-secret-32-chars";
const image = Buffer.from("synthetic bitmap signed by the inspector");
const metadata = {
  currency: "KHR",
  recipientLabel: "Test Owner",
  fixedAmountMinor: null,
  expiresAt: null,
  payloadHash: "a".repeat(64),
};
const access = {
  shareToken: "a".repeat(43),
  recoveryToken: "b".repeat(43),
  cookieValue: "session",
};
function input(overrides = {}) {
  const details = { ...metadata, ...overrides };
  return {
    ...access,
    operation: "save",
    currencyMode: "dual",
    image: `data:image/png;base64,${image.toString("base64")}`,
    token: signQrPreview(details, {
      billId: "bill",
      ownerId: "owner",
      image,
      secret,
    }),
  };
}

describe("owner QR default versus accepted currencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PARTICIPANT_SESSION_SECRET", secret);
    mocks.bill.mockResolvedValue({ id: "bill", currency: "USD" });
    mocks.actor.mockResolvedValue({ id: "owner", is_creator: true });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "bill" } }),
    };
    mocks.from.mockReturnValue(query);
    mocks.inspect.mockResolvedValue({ ...metadata, image });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("previews a KHR-default amount-free QR on a USD bill", async () => {
    const preview = await previewOwnerQr({ ...access, file: {} });
    expect(preview).toMatchObject({
      currency: "KHR",
      recipientLabel: "Test Owner",
      fixedAmountMinor: null,
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("persists both currencies only after the owner selects dual mode", async () => {
    await saveOwnerQr(input());
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_bill_payment_method_v2",
      expect.objectContaining({
        qr_currency: "KHR",
        qr_currencies: ["KHR", "USD"],
        fixed_amount: null,
      }),
    );
    expect(mocks.upload).toHaveBeenCalledOnce();
  });
  it("rejects an unconfirmed currency mismatch before uploading or writing", async () => {
    await expect(
      saveOwnerQr({ ...input(), currencyMode: "single" }),
    ).rejects.toThrow(/bill uses USD/);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects dual mode for fixed amounts even if the browser is tampered with", async () => {
    await expect(saveOwnerQr(input({ fixedAmountMinor: 500 }))).rejects.toThrow(
      /fixed-amount/,
    );
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.inspect.mockResolvedValue({
      ...metadata,
      fixedAmountMinor: 500,
      image,
    });
    await expect(previewOwnerQr({ ...access, file: {} })).rejects.toThrow(
      /Upload a USD QR/,
    );
  });
  it("removes a dual-currency QR through the existing authorized removal function", async () => {
    await saveOwnerQr({
      ...access,
      operation: "remove",
      expectedMethodId: "method",
      expectedUpdatedAt: "version",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_bill_payment_method",
      expect.objectContaining({ operation: "remove" }),
    );
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
