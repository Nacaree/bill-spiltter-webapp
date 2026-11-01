import { describe, expect, it } from "vitest";
import { reviewExpenseDraft } from "@/lib/expense-draft";

const people = ["a", "b", "c"].map((id) => ({ id }));
const draft = {
  description: "Dinner",
  amount: "10.00",
  paidBy: "a",
  date: "2026-10-29",
  people: ["a", "b", "c"],
  method: "equal",
  exact: {},
};

describe("shared expense form draft", () => {
  it("previews the exact remainder allocation used when saving", () => {
    const review = reviewExpenseDraft(draft, people);
    expect(review.errors).toEqual({});
    expect(review.amountMinor).toBe(1000);
    expect(review.shares.map((share) => share.amountMinor)).toEqual([
      334, 333, 333,
    ]);
  });

  it.each(["0", "-1", "1.001", "9999999999999999", ""])(
    "rejects invalid expense amount %s without attempting a split",
    (amount) => {
      const review = reviewExpenseDraft({ ...draft, amount }, people);
      expect(review.errors.amount).toBeTruthy();
      expect(review.shares).toEqual([]);
    },
  );

  it.each([[], ["a", "a"], ["a", "removed"]].map((selected) => [selected]))(
    "rejects missing, duplicate, or stale participants: %j",
    (selected) => {
      const review = reviewExpenseDraft({ ...draft, people: selected }, people);
      expect(review.errors.people).toBeTruthy();
      expect(review.shares).toEqual([]);
    },
  );

  it("requires a description and a payer on the current bill", () => {
    expect(
      reviewExpenseDraft(
        { ...draft, description: "  ", paidBy: "removed" },
        people,
      ).errors,
    ).toMatchObject({
      description: expect.any(String),
      paidBy: expect.any(String),
    });
  });

  it.each(["", "2026-02-29", "2026-04-31", "2026-13-01", "29/10/2026"])(
    "rejects invalid calendar date %s",
    (date) => {
      expect(
        reviewExpenseDraft({ ...draft, date }, people).errors.date,
      ).toBeTruthy();
    },
  );

  it("accepts leap days and exact shares including zero", () => {
    const review = reviewExpenseDraft(
      {
        ...draft,
        date: "2028-02-29",
        method: "exact",
        exact: { a: "0", b: "3.33", c: "6.67" },
      },
      people,
    );
    expect(review.errors).toEqual({});
    expect(review.shares.map((share) => share.amountMinor)).toEqual([
      0, 333, 667,
    ]);
  });

  it("retains entered shares for a mismatched preview and rejects saving them", () => {
    const review = reviewExpenseDraft(
      { ...draft, method: "exact", exact: { a: "1", b: "2", c: "3" } },
      people,
    );
    expect(review.errors.splitTotal).toBeTruthy();
    expect(review.shares.map((share) => share.amountMinor)).toEqual([
      100, 200, 300,
    ]);
  });

  it("identifies malformed individual shares separately from a mismatched total", () => {
    const review = reviewExpenseDraft(
      { ...draft, method: "exact", exact: { a: "1.001", b: "2", c: "7" } },
      people,
    );
    expect(review.errors.exact).toEqual({ a: expect.any(String) });
    expect(review.errors.splitTotal).toBeUndefined();
  });
});
