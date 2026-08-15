import { describe, expect, it } from "vitest";
import { parseCreateBill, parseJoinBill } from "@/lib/bill-input";

function form(values) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("bill input validation", () => {
  it("trims and accepts a valid create request", () => {
    const result = parseCreateBill(
      form({
        billName: "  Beach weekend ",
        currency: "USD",
        participantName: " Sokha ",
      }),
    );
    expect(result).toEqual({
      data: {
        billName: "Beach weekend",
        currency: "USD",
        participantName: "Sokha",
      },
      errors: null,
    });
  });

  it("rejects blank names and unsupported currencies", () => {
    const result = parseCreateBill(
      form({ billName: " ", currency: "BTC", participantName: "" }),
    );
    expect(result.data).toBeNull();
    expect(result.errors).toMatchObject({
      billName: expect.any(String),
      currency: expect.any(String),
      participantName: expect.any(String),
    });
  });

  it("accepts only a full-strength share capability for joining", () => {
    const valid = parseJoinBill(
      form({ participantName: "Dara", shareToken: "a".repeat(43) }),
    );
    expect(valid.errors).toBeNull();

    const invalid = parseJoinBill(
      form({ participantName: "Dara", shareToken: "guessable" }),
    );
    expect(invalid.errors?.shareToken).toBeTruthy();
  });
});
