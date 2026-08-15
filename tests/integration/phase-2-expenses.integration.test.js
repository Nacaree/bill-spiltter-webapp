// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const liveDescribe = integrationEnabled ? describe : describe.skip;
const createdBillIds = [];
let addParticipant;
let createBillWithCreator;
let createExpense;
let ExpenseValidationError;
let getExpenseActivity;
let getExpenses;
let getServerSupabase;
let removeExpense;
let updateExpense;

function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

liveDescribe("Phase 2 live expense transactions", () => {
  beforeAll(async () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    expect(
      process.env.PARTICIPANT_SESSION_SECRET?.length,
    ).toBeGreaterThanOrEqual(32);
    ({ addParticipant, createBillWithCreator } =
      await import("@/server/bills"));
    ({
      createExpense,
      ExpenseValidationError,
      getExpenseActivity,
      getExpenses,
      removeExpense,
      updateExpense,
    } = await import("@/server/expenses"));
    ({ getServerSupabase } = await import("@/lib/supabase-server"));
  });

  afterAll(async () => {
    if (!createdBillIds.length) return;
    const { error } = await getServerSupabase()
      .from("bills")
      .delete()
      .in("id", createdBillIds);
    if (error) throw error;
  });

  it("keeps shares, expense changes, and audit events atomic", async () => {
    const created = await createBillWithCreator({
      billName: uniqueName("Expense transaction"),
      currency: "USD",
      participantName: uniqueName("Creator"),
    });
    createdBillIds.push(created.billId);
    const second = await addParticipant({
      cookieValue: created.sessionValue,
      participantName: uniqueName("Friend"),
      shareToken: created.shareToken,
    });
    const { data: creator } = await getServerSupabase()
      .from("bill_participants")
      .select("id")
      .eq("bill_id", created.billId)
      .eq("is_creator", true)
      .single();

    const base = {
      amountMinor: 1001,
      category: "food",
      cookieValue: created.sessionValue,
      description: "Live transaction dinner",
      expenseDate: "2026-08-16",
      notes: "Created by the Phase 2 integration check",
      paidByParticipantId: creator.id,
      shareToken: created.shareToken,
      splitMethod: "equal",
    };

    await expect(
      createExpense({
        ...base,
        shares: [
          { amountMinor: 501, participantId: creator.id },
          { amountMinor: 499, participantId: second.participantId },
        ],
      }),
    ).rejects.toBeInstanceOf(ExpenseValidationError);
    expect(await getExpenses(created.billId)).toHaveLength(0);
    expect(await getExpenseActivity(created.billId)).toHaveLength(0);

    const added = await createExpense({
      ...base,
      shares: [
        { amountMinor: 501, participantId: creator.id },
        { amountMinor: 500, participantId: second.participantId },
      ],
    });
    let expenses = await getExpenses(created.billId);
    expect(expenses).toHaveLength(1);
    expect(
      expenses[0].shares.reduce((sum, share) => sum + share.amountMinor, 0),
    ).toBe(expenses[0].amount_minor);

    await updateExpense({
      ...base,
      amountMinor: 1200,
      description: "Updated live transaction dinner",
      expenseId: added.expenseId,
      shares: [
        { amountMinor: 400, participantId: creator.id },
        { amountMinor: 800, participantId: second.participantId },
      ],
      splitMethod: "exact",
    });
    expenses = await getExpenses(created.billId);
    expect(expenses[0]).toMatchObject({
      amount_minor: 1200,
      description: "Updated live transaction dinner",
      split_method: "exact",
    });
    expect(expenses[0].shares.map((share) => share.amountMinor).sort()).toEqual(
      [400, 800],
    );

    await removeExpense({
      cookieValue: created.sessionValue,
      expenseId: added.expenseId,
      shareToken: created.shareToken,
    });
    expect(await getExpenses(created.billId)).toHaveLength(0);
    expect(
      (await getExpenseActivity(created.billId)).map((item) => item.action),
    ).toEqual(["expense.removed", "expense.updated", "expense.created"]);
  });
});
