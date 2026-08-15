import { describe, expect, it } from "vitest";
import { allocateReceipt } from "@/lib/receipt-allocation";

const people = ["person-a", "person-b", "person-c"];

describe("receipt allocation", () => {
  it("preserves item and final totals through indivisible rounding", () => {
    const allocated = allocateReceipt({
      adjustmentMethod: "proportional",
      items: [
        {
          clientKey: "item-a",
          participantIds: people,
          totalMinor: 1000,
        },
      ],
      totalMinor: 1101,
    });

    expect(allocated.itemAssignments.map((item) => item.amountMinor)).toEqual([
      334, 333, 333,
    ]);
    expect(allocated.finalShares.map((item) => item.amountMinor)).toEqual([
      368, 367, 366,
    ]);
    expect(
      allocated.finalShares.reduce((sum, item) => sum + item.amountMinor, 0),
    ).toBe(1101);
  });

  it("allocates a receipt-level discount without negative shares", () => {
    const allocated = allocateReceipt({
      adjustmentMethod: "equal",
      items: [
        {
          clientKey: "item-a",
          participantIds: people.slice(0, 2),
          totalMinor: 1000,
        },
      ],
      totalMinor: 901,
    });
    expect(allocated.adjustment).toBe(-99);
    expect(allocated.finalShares).toEqual([
      { amountMinor: 450, participantId: "person-a" },
      { amountMinor: 451, participantId: "person-b" },
    ]);
  });

  it("requires custom adjustments to match the exact difference", () => {
    expect(() =>
      allocateReceipt({
        adjustmentMethod: "custom",
        customAdjustments: [
          { amountMinor: 30, participantId: "person-a" },
          { amountMinor: 20, participantId: "person-b" },
        ],
        items: [
          {
            clientKey: "item-a",
            participantIds: people.slice(0, 2),
            totalMinor: 1000,
          },
        ],
        totalMinor: 1100,
      }),
    ).toThrow("Custom adjustments must match the receipt difference.");
  });
});
