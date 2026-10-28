import { expect, it } from "vitest";
import {
  allocateReceiptReview,
  receiptAllocationMismatch,
  savedCustomAdjustments,
} from "@/lib/receipt-review";
import { parseReceiptConfirmation } from "@/lib/receipt-input";
const owner = "00000000-0000-4000-8000-000000000001",
  guest = "00000000-0000-4000-8000-000000000002",
  third = "00000000-0000-4000-8000-000000000003";
function fixture(method = "proportional") {
  return {
    id: third,
    total_minor: 1101,
    adjustment_method: method,
    items: [
      {
        id: owner,
        total_minor: 1001,
        assignments: [
          { participantId: owner, amountMinor: 501 },
          { participantId: guest, amountMinor: 500 },
        ],
      },
    ],
    expense: {
      id: guest,
      amount_minor: 1101,
      updated_at: "2026-10-28T00:00:00.000001+00:00",
      shares: [
        { participantId: owner, amountMinor: 551 },
        { participantId: guest, amountMinor: 550 },
      ],
    },
  };
}
function input(scan) {
  return {
    items: scan.items.map((row) => ({
      clientKey: "0",
      savedItemId: row.id,
      totalMinor: row.total_minor,
      participantIds: [guest, owner],
    })),
    totalMinor: 1101,
    adjustmentMethod: scan.adjustment_method,
    customAdjustments: savedCustomAdjustments(scan),
  };
}
it("preserves original indivisible cents even when submitted participant order changes", () => {
  const scan = fixture();
  expect(receiptAllocationMismatch(scan)).toBe(false);
  const result = allocateReceiptReview(input(scan), scan);
  expect(result.finalShares).toEqual(scan.expense.shares);
  expect(result.itemAssignments.map((row) => row.amountMinor)).toEqual([
    501, 500,
  ]);
});
it("preserves alternate valid rounding and custom positive/negative adjustments", () => {
  const scan = fixture();
  scan.expense.shares = [
    { participantId: owner, amountMinor: 552 },
    { participantId: guest, amountMinor: 549 },
  ];
  expect(receiptAllocationMismatch(scan)).toBe(false);
  expect(allocateReceiptReview(input(scan), scan).finalShares).toEqual(
    scan.expense.shares,
  );
  scan.adjustment_method = "custom";
  scan.expense.shares = [
    { participantId: owner, amountMinor: 450 },
    { participantId: guest, amountMinor: 651 },
  ];
  expect(savedCustomAdjustments(scan)).toEqual([
    { participantId: owner, amountMinor: -51 },
    { participantId: guest, amountMinor: 151 },
  ]);
  expect(allocateReceiptReview(input(scan), scan).finalShares).toEqual(
    scan.expense.shares,
  );
});
it.each(["proportional", "equal", "custom"])(
  "recalculates changed membership with %s adjustments",
  (method) => {
    const scan = fixture(method),
      values = input(scan);
    values.items[0].participantIds.push(third);
    if (method === "custom")
      values.customAdjustments = [
        { participantId: owner, amountMinor: 34 },
        { participantId: guest, amountMinor: 33 },
        { participantId: third, amountMinor: 33 },
      ];
    const result = allocateReceiptReview(values, scan);
    expect(result.finalShares).toHaveLength(3);
    expect(
      result.finalShares.reduce((sum, row) => sum + row.amountMinor, 0),
    ).toBe(1101);
  },
);
it("detects legacy total and split changes instead of silently preserving them", () => {
  const scan = fixture();
  scan.expense.shares = [
    { participantId: owner, amountMinor: 100 },
    { participantId: guest, amountMinor: 1001 },
  ];
  expect(receiptAllocationMismatch(scan)).toBe(true);
  expect(allocateReceiptReview(input(scan), scan).finalShares).not.toEqual(
    scan.expense.shares,
  );
  scan.expense.amount_minor = 1200;
  expect(receiptAllocationMismatch(scan)).toBe(true);
});
function form(scan) {
  const fields = {
    shareToken: "a".repeat(43),
    receiptScanId: scan.id,
    expenseId: scan.expense.id,
    expectedUpdatedAt: scan.expense.updated_at,
    adjustmentMethod: scan.adjustment_method,
    category: "food",
    description: "Saved dinner",
    paidByParticipantId: owner,
    merchantName: "Cafe",
    expenseDate: "2026-10-28",
    itemCount: "1",
    subtotal: "10.01",
    tax: "1.00",
    tip: "0.00",
    discount: "0.00",
    total: "11.01",
    "item-0-id": owner,
    "item-0-description": "Dinner",
    "item-0-total": "10.01",
    "item-0-quantity": "1",
  };
  const result = new FormData();
  Object.entries(fields).forEach(([key, value]) => result.set(key, value));
  result.append("item-0-participant", guest);
  result.append("item-0-participant", owner);
  return result;
}
it("parses edit identity without a confirmation key and preserves original allocations", () => {
  const scan = fixture(),
    data = form(scan);
  expect(
    parseReceiptConfirmation(data, "USD", {
      editing: true,
      savedReceipt: scan,
    }),
  ).toMatchObject({
    errors: null,
    data: {
      expectedUpdatedAt: scan.expense.updated_at,
      expenseId: scan.expense.id,
      finalShares: scan.expense.shares,
    },
  });
  data.delete("expectedUpdatedAt");
  expect(
    parseReceiptConfirmation(data, "USD", { editing: true, savedReceipt: scan })
      .data,
  ).toBeNull();
});
it("requires explicit acknowledgement of a legacy split replacement", () => {
  const scan = fixture();
  scan.expense.amount_minor = 1200;
  const data = form(scan);
  expect(
    parseReceiptConfirmation(data, "USD", { editing: true, savedReceipt: scan })
      .errors.form,
  ).toContain("Confirm replacing");
  data.set("acknowledgeRecalculation", "yes");
  expect(
    parseReceiptConfirmation(data, "USD", { editing: true, savedReceipt: scan })
      .errors,
  ).toBeNull();
});
it("keeps KHR whole-unit splits exact", () => {
  const scan = fixture(),
    values = input(scan);
  values.totalMinor = 1001;
  values.items[0].participantIds = [owner, guest, third];
  const result = allocateReceiptReview(values, scan);
  expect(result.finalShares.map((row) => row.amountMinor)).toEqual([
    334, 334, 333,
  ]);
});

it("preserves historical inactive item amounts when adding another active person", () => {
  const scan = fixture();
  scan.reviewParticipants = [
    { id: owner },
    { id: guest, deactivated_at: "2026-01-01" },
    { id: third },
  ];
  const values = input(scan);
  values.items[0].participantIds.push(third);
  const result = allocateReceiptReview(values, scan);
  expect(
    result.itemAssignments.find((row) => row.participantId === guest)
      .amountMinor,
  ).toBe(500);
  expect(
    result.itemAssignments.reduce((sum, row) => sum + row.amountMinor, 0),
  ).toBe(1001);
});
