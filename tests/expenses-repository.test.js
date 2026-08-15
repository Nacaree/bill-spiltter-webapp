import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashAccessToken } from "@/lib/access-tokens";
import { createParticipantSession } from "@/lib/participant-session";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({ rpc: mocks.rpc }),
}));

import {
  createExpense,
  ExpenseValidationError,
  removeExpense,
  updateExpense,
} from "@/server/expenses";

const billId = "018f0f67-2a03-7e9d-8e1c-75dcfcb18be7";
const actorId = "018f0f67-4d58-7ee1-8cc8-b24c75e64a42";
const otherId = "018f0f67-5f4d-7a1b-8df3-a0830eef72ee";
const expenseId = "018f0f67-6be5-7994-b713-e9c10266c7cb";
const shareToken = "x".repeat(43);
const sessionToken = "y".repeat(43);
const secret = "expense-repository-secret-that-is-long-enough";

function cookieValue() {
  return createParticipantSession({
    billId,
    participantId: actorId,
    secret,
    sessionToken,
  }).value;
}

function expense(overrides = {}) {
  return {
    amountMinor: 1001,
    category: "food",
    cookieValue: cookieValue(),
    description: "Dinner",
    expenseDate: "2026-08-16",
    notes: "Shared meal",
    paidByParticipantId: actorId,
    shareToken,
    shares: [
      { amountMinor: 501, participantId: actorId },
      { amountMinor: 500, participantId: otherId },
    ],
    splitMethod: "equal",
    ...overrides,
  };
}

describe("expense repository transaction boundary", () => {
  beforeEach(() => {
    process.env.PARTICIPANT_SESSION_SECRET = secret;
    mocks.rpc.mockReset();
  });

  afterEach(() => {
    delete process.env.PARTICIPANT_SESSION_SECRET;
  });

  it("creates an expense using only hashed capabilities and integer shares", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ expense_id: expenseId }],
      error: null,
    });

    await expect(createExpense(expense())).resolves.toEqual({ expenseId });
    expect(mocks.rpc).toHaveBeenCalledWith("create_manual_expense", {
      actor_participant_id: actorId,
      actor_session_hash: hashAccessToken(sessionToken),
      expense_amount_minor: 1001,
      expense_category: "food",
      expense_date: "2026-08-16",
      expense_description: "Dinner",
      expense_notes: "Shared meal",
      expense_split_method: "equal",
      paid_by_participant_id: actorId,
      share_hash: hashAccessToken(shareToken),
      share_rows: [
        { amount_minor: 501, participant_id: actorId },
        { amount_minor: 500, participant_id: otherId },
      ],
    });
  });

  it("updates and removes through their atomic database functions", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ expense_id: expenseId }],
      error: null,
    });

    await updateExpense(expense({ expenseId }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_manual_expense",
      expect.objectContaining({
        new_expense_date: "2026-08-16",
        new_paid_by_participant_id: actorId,
        target_expense_id: expenseId,
      }),
    );

    await removeExpense({
      cookieValue: cookieValue(),
      expenseId,
      shareToken,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith("remove_manual_expense", {
      actor_participant_id: actorId,
      actor_session_hash: hashAccessToken(sessionToken),
      share_hash: hashAccessToken(shareToken),
      target_expense_id: expenseId,
    });
  });

  it("maps database invariant failures to a safe validation error", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0004", message: "shares do not match" },
    });

    await expect(createExpense(expense())).rejects.toBeInstanceOf(
      ExpenseValidationError,
    );
  });
});
