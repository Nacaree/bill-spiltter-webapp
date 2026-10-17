import { expect, it } from "vitest";
import { parseSettlementForm } from "@/lib/settlement-input";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
function form(changes = {}) {
  const data = new FormData();
  for (const [k, v] of Object.entries({
    shareToken: "a".repeat(43),
    settlementId: a,
    fromParticipantId: a,
    toParticipantId: b,
    amount: "12.34",
    settledDate: "2026-10-17",
    confirmed: "yes",
    ...changes,
  }))
    data.set(k, v);
  return data;
}
it("validates currency precision and explicit payment confirmation", () => {
  expect(parseSettlementForm(form(), "USD").data.amountMinor).toBe(1234);
  expect(parseSettlementForm(form(), "KHR").errors.amount).toBeTruthy();
  expect(
    parseSettlementForm(form({ confirmed: "" }), "USD").errors.confirmed,
  ).toBeTruthy();
  expect(
    parseSettlementForm(form({ toParticipantId: a }), "USD").errors
      .toParticipantId,
  ).toBeTruthy();
  expect(
    parseSettlementForm(form({ settledDate: "2026-02-30" }), "USD").errors
      .settledDate,
  ).toBeTruthy();
  expect(
    parseSettlementForm(form({ amount: "0" }), "USD").errors.amount,
  ).toBeTruthy();
});
it("requires a version for corrections and removals", () => {
  expect(
    parseSettlementForm(form(), "USD", { editing: true }).errors.form,
  ).toBeTruthy();
  expect(
    parseSettlementForm(
      form({ expectedUpdatedAt: "2026-10-17T00:00:00+00:00" }),
      "USD",
      { removing: true },
    ).data.settlementId,
  ).toBe(a);
});
