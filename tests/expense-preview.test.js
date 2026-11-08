import { describe, expect, it } from "vitest";
import { applyExpensePreview, expenseForPreview } from "@/lib/expense-preview";

const people = [
  { id: "payer", display_name: "Dara" },
  { id: "guest", display_name: "Dara" },
];
const expense = {
  id: "receipt",
  description: "Dinner",
  amount_minor: 1001,
  paid_by_participant_id: "payer",
  category: "Food & drinks",
  date: "2027-01-02",
  receipt: true,
  receiptLines: [{ id: "rice" }],
  shares: [
    { participantId: "payer", amountMinor: 800 },
    { participantId: "guest", amountMinor: 201 },
  ],
};

describe("Screen 2 expense adaptation", () => {
  it("uses identity for the payer and personal share, including duplicate names", () => {
    const preview = expenseForPreview(expense, people, "guest");
    expect(preview).toMatchObject({
      payerId: "payer",
      payer: "Dara",
      share: 201,
      dateISO: "2027-01-02",
      date: "02 JAN",
      year: 2027,
      method: "exact",
    });
    expect(expenseForPreview(expense, people, "unassigned").share).toBe(0);
  });
  it("round trips exact allocations and receipt metadata without replacing the expense", () => {
    const preview = expenseForPreview(expense, people, "guest");
    const saved = applyExpensePreview(expense, {
      ...preview,
      name: "Updated dinner",
    });
    expect(saved).toEqual({
      ...expense,
      description: "Updated dinner",
      split_method: "exact",
      notes: undefined,
    });
    expect(saved.receiptLines).toBe(expense.receiptLines);
  });
  it("keeps an explicitly equal split and updates identities without using labels", () => {
    const preview = expenseForPreview(
      { ...expense, split_method: "equal" },
      people,
      "payer",
    );
    expect(preview.method).toBe("equal");
    expect(
      applyExpensePreview(expense, { ...preview, payerId: "guest" })
        .paid_by_participant_id,
    ).toBe("guest");
  });
});
