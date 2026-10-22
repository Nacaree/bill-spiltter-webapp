import { hashAccessToken } from "@/lib/access-tokens";
import { verifyParticipantSession } from "@/lib/participant-session";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  BillNotFoundError,
  requireActiveBillId,
  ParticipantSessionRequiredError,
} from "@/server/bills";

export class ExpenseValidationError extends Error {}

function resultRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function sessionSecrets() {
  const secrets = [process.env.PARTICIPANT_SESSION_SECRET];
  if (process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET) {
    secrets.push(process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET);
  }
  return secrets;
}

function authenticatedCapability(shareToken, cookieValue) {
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }
  const session = verifyParticipantSession(cookieValue, {
    secrets: sessionSecrets(),
  });
  if (!session) throw new ParticipantSessionRequiredError();
  return {
    actorParticipantId: session.participantId,
    actorSessionHash: hashAccessToken(session.sessionToken),
    shareHash,
  };
}

function throwDatabaseError(error) {
  if (error.code === "P0001") throw new ParticipantSessionRequiredError();
  if (error.code === "P0002") throw new BillNotFoundError();
  if (error.code === "P0004") throw new ExpenseValidationError(error.message);
  throw new Error(`Database operation failed (${error.code ?? "unknown"}).`);
}

function commonExpenseParameters(expense) {
  return {
    expense_amount_minor: expense.amountMinor,
    expense_category: expense.category,
    expense_description: expense.description,
    expense_notes: expense.notes,
    expense_split_method: expense.splitMethod,
    share_rows: expense.shares.map(({ amountMinor, participantId }) => ({
      amount_minor: amountMinor,
      participant_id: participantId,
    })),
  };
}

export async function createExpense(expense) {
  const access = authenticatedCapability(
    expense.shareToken,
    expense.cookieValue,
  );
  const { data, error } = await getServerSupabase().rpc(
    "create_manual_expense",
    {
      actor_participant_id: access.actorParticipantId,
      actor_session_hash: access.actorSessionHash,
      ...commonExpenseParameters(expense),
      expense_date: expense.expenseDate,
      paid_by_participant_id: expense.paidByParticipantId,
      share_hash: access.shareHash,
    },
  );
  if (error) throwDatabaseError(error);
  const created = resultRow(data);
  if (!created?.expense_id) {
    throw new Error("Database did not return the created expense identity.");
  }
  return { expenseId: created.expense_id };
}

export async function updateExpense(expense) {
  const access = authenticatedCapability(
    expense.shareToken,
    expense.cookieValue,
  );
  const { data, error } = await getServerSupabase().rpc(
    "update_manual_expense",
    {
      actor_participant_id: access.actorParticipantId,
      actor_session_hash: access.actorSessionHash,
      ...commonExpenseParameters(expense),
      new_expense_date: expense.expenseDate,
      new_paid_by_participant_id: expense.paidByParticipantId,
      share_hash: access.shareHash,
      target_expense_id: expense.expenseId,
    },
  );
  if (error) throwDatabaseError(error);
  const updated = resultRow(data);
  if (!updated?.expense_id) {
    throw new Error("Database did not return the updated expense identity.");
  }
  return { expenseId: updated.expense_id };
}

export async function removeExpense({ cookieValue, expenseId, shareToken }) {
  const access = authenticatedCapability(shareToken, cookieValue);
  const { data, error } = await getServerSupabase().rpc(
    "remove_manual_expense",
    {
      actor_participant_id: access.actorParticipantId,
      actor_session_hash: access.actorSessionHash,
      share_hash: access.shareHash,
      target_expense_id: expenseId,
    },
  );
  if (error) throwDatabaseError(error);
  const removed = resultRow(data);
  if (!removed?.expense_id) {
    throw new Error("Database did not return the removed expense identity.");
  }
  return { expenseId: removed.expense_id };
}

export async function getExpenses(billId, { category, participantId } = {}) {
  await requireActiveBillId(billId);
  let query = getServerSupabase()
    .from("expenses")
    .select(
      "id, description, amount_minor, paid_by_participant_id, split_method, category, expense_date, notes, receipt_scan_id, created_by_participant_id, updated_by_participant_id, created_at, updated_at",
    )
    .eq("bill_id", billId)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);

  const { data: expenses, error: expenseError } = await query;
  if (expenseError) throwDatabaseError(expenseError);
  if (!expenses.length) return [];

  const expenseIds = expenses.map((expense) => expense.id);
  const { data: shareRows, error: shareError } = await getServerSupabase()
    .from("expense_shares")
    .select("expense_id, participant_id, amount_minor")
    .in("expense_id", expenseIds)
    .order("created_at", { ascending: true });
  if (shareError) throwDatabaseError(shareError);

  const sharesByExpense = new Map();
  shareRows.forEach((share) => {
    const mappedShare = {
      amountMinor: Number(share.amount_minor),
      expenseId: share.expense_id,
      participantId: share.participant_id,
    };
    const current = sharesByExpense.get(share.expense_id) ?? [];
    current.push(mappedShare);
    sharesByExpense.set(share.expense_id, current);
  });

  return expenses
    .map((expense) => ({
      ...expense,
      amount_minor: Number(expense.amount_minor),
      shares: sharesByExpense.get(expense.id) ?? [],
    }))
    .filter(
      (expense) =>
        !participantId ||
        expense.shares.some((share) => share.participantId === participantId),
    );
}

export async function getExpenseActivity(billId, limit = 12) {
  await requireActiveBillId(billId);
  const { data, error } = await getServerSupabase()
    .from("activity_log")
    .select("id, actor_participant_id, action, metadata, created_at")
    .eq("bill_id", billId)
    .eq("entity_type", "expense")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throwDatabaseError(error);
  return data;
}

export async function getBillActivity(billId, limit = 12) {
  await requireActiveBillId(billId);
  const { data, error } = await getServerSupabase()
    .from("activity_log")
    .select("id, actor_participant_id, action, metadata, created_at")
    .eq("bill_id", billId)
    .in("entity_type", ["expense", "settlement", "payment_method"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throwDatabaseError(error);
  return data;
}
