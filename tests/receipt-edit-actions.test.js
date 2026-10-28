// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  bill: vi.fn(),
  revalidate: vi.fn(),
  report: vi.fn(),
  add: vi.fn(),
}));
vi.mock("@/server/protected-action", () => ({
  protectedAction: (_name, work) => work(),
}));
vi.mock("@/server/rate-limit-access", () => ({ guardBillOperation: m.guard }));
vi.mock("@/server/rate-limits", () => ({ guardOperation: vi.fn() }));
vi.mock("@/server/monitoring", () => ({ reportAppError: m.report }));
vi.mock("@/server/bills", () => ({
  getBillByShareToken: m.bill,
  addParticipant: m.add,
  BillNotFoundError: class extends Error {},
  ParticipantSessionRequiredError: class extends Error {},
  ParticipantNameTakenError: class extends Error {},
}));
vi.mock("@/server/expenses", () => ({
  ExpenseValidationError: class extends Error {},
}));
vi.mock("@/server/receipts", () => ({
  getReceiptForEditing: m.load,
  updateReceiptExpense: m.save,
  ReceiptConflictError: class extends Error {},
  ReceiptNotFoundError: class extends Error {},
  ReceiptEditSetupError: class extends Error {},
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "private-session" }) }),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { updateReceiptAction, addParticipantAction } from "@/app/actions";
import { ReceiptConflictError } from "@/server/receipts";
import { ParticipantSessionRequiredError } from "@/server/bills";
const actor = "00000000-0000-4000-8000-000000000001",
  scanId = "00000000-0000-4000-8000-000000000002",
  expenseId = "00000000-0000-4000-8000-000000000003",
  itemId = "00000000-0000-4000-8000-000000000004",
  share = "a".repeat(43),
  version = "2026-10-28T00:00:00.000001+00:00";
function form() {
  const fd = new FormData();
  Object.entries({
    shareToken: share,
    receiptScanId: scanId,
    expenseId,
    expectedUpdatedAt: version,
    adjustmentMethod: "proportional",
    category: "food",
    description: "Dinner",
    merchantName: "Cafe",
    expenseDate: "2026-10-28",
    itemCount: "1",
    subtotal: "10.00",
    tax: "0.00",
    tip: "0.00",
    discount: "0.00",
    total: "10.00",
    paidByParticipantId: actor,
    "item-0-id": itemId,
    "item-0-description": "Food",
    "item-0-total": "10.00",
    "item-0-quantity": "1",
    "item-0-participant": actor,
  }).forEach(([key, value]) => fd.set(key, value));
  return fd;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.bill.mockResolvedValue({ id: "bill", currency: "USD" });
  m.load.mockResolvedValue({
    id: scanId,
    status: "confirmed",
    total_minor: 1000,
    adjustment_method: "proportional",
    items: [
      {
        id: itemId,
        total_minor: 1000,
        assignments: [{ participantId: actor, amountMinor: 1000 }],
      },
    ],
    expense: {
      id: expenseId,
      updated_at: version,
      amount_minor: 1000,
      shares: [{ participantId: actor, amountMinor: 1000 }],
    },
  });
  m.save.mockResolvedValue({ expenseId, updatedAt: "next-version" });
});
it("authorizes before loading saved data, saves integer allocations and refreshes both routes", async () => {
  expect(await updateReceiptAction({}, form())).toMatchObject({
    success: true,
    expenseId,
  });
  expect(m.guard).toHaveBeenCalledWith("write", {
    shareToken: share,
    cookieValue: "private-session",
  });
  expect(m.guard.mock.invocationCallOrder[0]).toBeLessThan(
    m.load.mock.invocationCallOrder[0],
  );
  expect(m.save).toHaveBeenCalledWith(
    expect.objectContaining({
      expenseId,
      expectedUpdatedAt: version,
      totalMinor: 1000,
      assignmentRows: [
        { clientKey: "0", participantId: actor, amountMinor: 1000 },
      ],
      cookieValue: "private-session",
    }),
  );
  expect(m.revalidate.mock.calls).toEqual([
    [`/b/${share}`],
    [`/b/${share}/receipts/${scanId}`],
  ]);
});
it("rejects unauthorized sessions before reading the receipt", async () => {
  m.guard.mockRejectedValue(new ParticipantSessionRequiredError());
  expect((await updateReceiptAction({}, form())).errors.form).toContain("Join");
  expect(m.load).not.toHaveBeenCalled();
  expect(m.save).not.toHaveBeenCalled();
});
it("returns a clear conflict for both stale loaded versions and database races", async () => {
  const stale = form();
  stale.set("expectedUpdatedAt", "2026-10-27T00:00:00Z");
  expect(await updateReceiptAction({}, stale)).toMatchObject({
    code: "receipt_conflict",
  });
  expect(m.save).not.toHaveBeenCalled();
  m.save.mockRejectedValue(new ReceiptConflictError());
  expect(await updateReceiptAction({}, form())).toMatchObject({
    code: "receipt_conflict",
  });
  expect(m.report).not.toHaveBeenCalled();
});
it("rejects deleted and mismatched expense identities", async () => {
  const fd = form();
  fd.set("expenseId", actor);
  expect((await updateReceiptAction({}, fd)).errors.form).toContain(
    "no longer available",
  );
  m.load.mockResolvedValue({ expense: null });
  expect((await updateReceiptAction({}, form())).errors.form).toContain(
    "no longer available",
  );
  expect(m.save).not.toHaveBeenCalled();
});
it("requires legacy acknowledgement at the action boundary", async () => {
  const saved = await m.load();
  saved.expense.amount_minor = 900;
  expect((await updateReceiptAction({}, form())).errors.form).toContain(
    "Confirm replacing",
  );
  expect(m.save).not.toHaveBeenCalled();
  const fd = form();
  fd.set("acknowledgeRecalculation", "yes");
  expect(await updateReceiptAction({}, fd)).toMatchObject({ success: true });
});
it("returns only the new person's public identity for inline addition", async () => {
  m.add.mockResolvedValue({ participantId: actor });
  const fd = new FormData();
  fd.set("shareToken", share);
  fd.set("participantName", "  Dara  ");
  expect(await addParticipantAction({}, fd)).toEqual({
    success: true,
    participant: { id: actor, display_name: "Dara" },
  });
  expect(m.revalidate).toHaveBeenCalledWith(`/b/${share}`);
});
