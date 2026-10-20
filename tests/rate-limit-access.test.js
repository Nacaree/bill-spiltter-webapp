// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  bill: vi.fn(),
  actor: vi.fn(),
  creator: vi.fn(),
  guard: vi.fn(),
}));
vi.mock("@/server/bills", () => ({
  getBillByShareToken: m.bill,
  getSessionParticipant: m.actor,
  ParticipantSessionRequiredError: class extends Error {},
}));
vi.mock("@/server/payment-methods", () => ({ requireCreator: m.creator }));
vi.mock("@/server/rate-limits", () => ({ guardOperation: m.guard }));
import { guardBillOperation } from "@/server/rate-limit-access";
beforeEach(() => {
  vi.resetAllMocks();
  m.bill.mockResolvedValue({ id: "real-bill" });
  m.actor.mockResolvedValue({ id: "real-actor" });
  m.creator.mockResolvedValue({
    bill: { id: "real-bill" },
    actor: { id: "owner" },
  });
});
it("resolves identities through existing authorization, ignoring submitted counter identities", async () => {
  await guardBillOperation("write", {
    shareToken: "capability",
    cookieValue: "cookie",
    billId: "forged",
    participantId: "forged",
  });
  expect(m.guard).toHaveBeenCalledWith("write", {
    billId: "real-bill",
    participantId: "real-actor",
  });
});
it("does not charge a participant/bill counter after unauthorized access", async () => {
  m.actor.mockResolvedValue(null);
  await expect(
    guardBillOperation("write", { shareToken: "x" }),
  ).rejects.toThrow();
  expect(m.guard).not.toHaveBeenCalled();
  m.creator.mockRejectedValue(new Error("Owner required"));
  await expect(
    guardBillOperation("write", { shareToken: "x" }, { owner: true }),
  ).rejects.toThrow("Owner");
  expect(m.guard).not.toHaveBeenCalled();
});
it("permits authorized joining without requiring an existing participant cookie", async () => {
  await guardBillOperation("people", { shareToken: "x" }, { joined: false });
  expect(m.actor).not.toHaveBeenCalled();
  expect(m.guard).toHaveBeenCalledWith("people", {
    billId: "real-bill",
    participantId: undefined,
  });
});
