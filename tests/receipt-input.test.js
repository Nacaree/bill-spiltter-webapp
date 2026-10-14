import { describe, expect, it } from "vitest";
import { parseReceiptConfirmation } from "@/lib/receipt-input";

function form() {
  const fields = {
    adjustmentMethod: "proportional",
    category: "food",
    confirmationKey: "00000000-0000-4000-8000-000000000001",
    receiptScanId: "00000000-0000-4000-8000-000000000002",
    paidByParticipantId: "00000000-0000-4000-8000-000000000003",
    shareToken: "a".repeat(43),
    description: "Dinner",
    merchantName: "Cafe",
    expenseDate: "2026-08-16",
    itemCount: "1",
    subtotal: "10.50",
    tax: "0.00",
    tip: "0.00",
    discount: "0.00",
    total: "10.50",
    "item-0-description": "Drinks",
    "item-0-total": "10.50",
    "item-0-unit-price": "3.50",
    "item-0-quantity": "3",
    "item-0-participant": "00000000-0000-4000-8000-000000000003",
  };
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("Receipt price confirmation input", () => {
  it("preserves unit price and quantity while allocating the line total once", () => {
    const parsed = parseReceiptConfirmation(form(), "USD");
    expect(parsed.errors).toBeNull();
    expect(parsed.data.itemRows[0]).toMatchObject({
      quantity: 3,
      unitPriceMinor: 350,
      totalMinor: 1050,
    });
    expect(parsed.data.finalShares[0].amountMinor).toBe(1050);
  });
  it("allows unreadable unit prices and older forms without quantity", () => {
    const data = form();
    data.delete("item-0-unit-price");
    data.delete("item-0-quantity");
    expect(
      parseReceiptConfirmation(data, "USD").data.itemRows[0],
    ).toMatchObject({ quantity: 1, unitPriceMinor: null });
  });
  it.each([
    ["item-0-unit-price", "-3.50"],
    ["item-0-unit-price", "3.500"],
    ["item-0-quantity", "0"],
    ["item-0-quantity", "1.0001"],
  ])("rejects invalid %s value %s", (field, value) => {
    const data = form();
    data.set(field, value);
    const parsed = parseReceiptConfirmation(data, "USD");
    expect(parsed.data).toBeNull();
    expect(parsed.errors.items).toBeTruthy();
  });
});
