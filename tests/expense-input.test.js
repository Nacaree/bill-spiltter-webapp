import { describe, expect, it } from "vitest";
import { parseExpenseForm, parseRemoveExpense } from "@/lib/expense-input";

const shareToken = "s".repeat(43);
const participantIds = [
  "018f0f67-4d58-7ee1-8cc8-b24c75e64a42",
  "018f0f67-5f4d-7a1b-8df3-a0830eef72ee",
  "018f0f67-6be5-7994-b713-e9c10266c7cb",
];

function expenseForm(overrides = {}) {
  const values = {
    amount: "10.00",
    category: "food",
    description: "Dinner",
    expenseDate: "2026-08-16",
    notes: "",
    paidByParticipantId: participantIds[0],
    participantId: participantIds,
    shareToken,
    splitMethod: "equal",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(name, item));
    } else {
      formData.set(name, value);
    }
  });
  return formData;
}

describe("expense form parsing", () => {
  it("creates a deterministic equal split in minor units", () => {
    const parsed = parseExpenseForm(expenseForm(), "USD");

    expect(parsed.errors).toBeNull();
    expect(parsed.data.amountMinor).toBe(1000);
    expect(parsed.data.shares).toEqual([
      { amountMinor: 334, participantId: participantIds[0] },
      { amountMinor: 333, participantId: participantIds[1] },
      { amountMinor: 333, participantId: participantIds[2] },
    ]);
  });

  it("accepts exact shares only when they match the expense total", () => {
    const valid = expenseForm({
      splitMethod: "exact",
      [`share-${participantIds[0]}`]: "5.50",
      [`share-${participantIds[1]}`]: "3.25",
      [`share-${participantIds[2]}`]: "1.25",
    });
    expect(parseExpenseForm(valid, "USD").data.shares).toEqual([
      { amountMinor: 550, participantId: participantIds[0] },
      { amountMinor: 325, participantId: participantIds[1] },
      { amountMinor: 125, participantId: participantIds[2] },
    ]);

    valid.set(`share-${participantIds[2]}`, "1.24");
    expect(parseExpenseForm(valid, "USD")).toMatchObject({
      data: null,
      errors: { shares: "Exact shares must match the expense total." },
    });
  });

  it("rejects impossible dates and duplicate people", () => {
    expect(
      parseExpenseForm(expenseForm({ expenseDate: "2026-02-30" }), "USD")
        .errors,
    ).toHaveProperty("expenseDate");
    expect(
      parseExpenseForm(
        expenseForm({ participantId: [participantIds[0], participantIds[0]] }),
        "USD",
      ),
    ).toMatchObject({
      data: null,
      errors: { participantIds: "Choose each person only once." },
    });
  });

  it("requires a valid expense id for edits and removals", () => {
    expect(
      parseExpenseForm(expenseForm({ expenseId: "bad" }), "USD", {
        editing: true,
      }),
    ).toMatchObject({
      data: null,
      errors: { form: "This expense is invalid." },
    });

    expect(
      parseRemoveExpense(
        new FormData(
          // FormData does not accept plain objects in browsers, so append below.
        ),
      ).data,
    ).toBeNull();
  });
});
