import { describe, expect, it } from "vitest";
import {
  BILL_CURRENCIES,
  parseAddParticipant,
  parseClaimParticipant,
  parseCreateBill,
  parseJoinBill,
} from "@/lib/bill-input";

function form(values) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("bill input validation", () => {
  it("offers only the two supported Cambodian currencies", () => {
    expect(BILL_CURRENCIES).toEqual(["KHR", "USD"]);
  });

  it.each(["KHR", "USD"])("accepts a %s bill", (currency) => {
    expect(
      parseCreateBill(
        form({ billName: "Dinner", currency, participantName: "Sokha" }),
      ).errors,
    ).toBeNull();
  });

  it.each(["EUR", "GBP"])("rejects a %s bill", (currency) => {
    expect(
      parseCreateBill(
        form({ billName: "Dinner", currency, participantName: "Sokha" }),
      ).errors?.currency,
    ).toBeTruthy();
  });

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

  it("validates claiming an existing participant", () => {
    const valid = parseClaimParticipant(
      form({ participantId: crypto.randomUUID(), shareToken: "a".repeat(43) }),
    );
    expect(valid.errors).toBeNull();

    const invalid = parseClaimParticipant(
      form({ participantId: "not-a-participant", shareToken: "short" }),
    );
    expect(invalid.errors).toMatchObject({
      participantId: expect.any(String),
      shareToken: expect.any(String),
    });
  });

  it("validates adding an unclaimed participant", () => {
    const valid = parseAddParticipant(
      form({ participantName: " Dara ", shareToken: "b".repeat(43) }),
    );
    expect(valid.data).toEqual({
      participantName: "Dara",
      shareToken: "b".repeat(43),
    });

    const invalid = parseAddParticipant(
      form({ participantName: " ", shareToken: "b".repeat(43) }),
    );
    expect(invalid.errors?.participantName).toBeTruthy();
  });
});
