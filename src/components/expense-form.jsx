"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, updateExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";
import { moneyInputValue } from "@/lib/money";

const initialState = { errors: null };

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function ExpenseForm({
  bill,
  defaults = null,
  expense = null,
  onSaved,
}) {
  const editing = Boolean(expense);
  const router = useRouter();
  const defaultParticipantIds = useMemo(
    () =>
      expense
        ? expense.shares.map((share) => share.participantId)
        : bill.participants.map((participant) => participant.id),
    [bill.participants, expense],
  );
  const [splitMethod, setSplitMethod] = useState(
    expense?.split_method ?? "equal",
  );
  const [selectedIds, setSelectedIds] = useState(defaultParticipantIds);
  const [state, action, pending] = useActionState(
    editing ? updateExpenseAction : createExpenseAction,
    initialState,
  );

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onSaved?.();
  }, [onSaved, router, state]);

  function toggleParticipant(participantId, checked) {
    setSelectedIds((current) =>
      checked
        ? [...current, participantId]
        : current.filter((id) => id !== participantId),
    );
  }

  return (
    <RetainedForm state={state} action={action} className="grid gap-5">
      <input type="hidden" name="shareToken" value={bill.shareToken} />
      {editing ? (
        <input type="hidden" name="expenseId" value={expense.id} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${editing ? expense.id : "new"}-description`}
          name="description"
          label="What was it?"
          placeholder="Dinner"
          autoComplete="off"
          defaultValue={
            expense?.description ?? defaults?.description ?? undefined
          }
          maxLength={120}
          required
          error={state.errors?.description}
        />
        <Field
          id={`${editing ? expense.id : "new"}-amount`}
          name="amount"
          label={`Total (${bill.currency})`}
          placeholder={bill.currency === "KHR" ? "40000" : "40.00"}
          inputMode="decimal"
          autoComplete="off"
          defaultValue={
            expense
              ? moneyInputValue(expense.amount_minor, bill.currency)
              : defaults?.amountMinor
                ? moneyInputValue(defaults.amountMinor, bill.currency)
                : undefined
          }
          required
          error={state.errors?.amount}
        />
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Paid by
          <select
            name="paidByParticipantId"
            defaultValue={
              expense?.paid_by_participant_id ?? bill.currentParticipantId
            }
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
          >
            {bill.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.display_name}
              </option>
            ))}
          </select>
          {state.errors?.paidByParticipantId ? (
            <span className="font-normal text-red-700">
              {state.errors.paidByParticipantId}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Date
          <input
            type="date"
            name="expenseDate"
            defaultValue={
              expense?.expense_date ?? defaults?.expenseDate ?? today()
            }
            required
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
          />
          {state.errors?.expenseDate ? (
            <span className="font-normal text-red-700">
              {state.errors.expenseDate}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Category
          <select
            name="category"
            defaultValue={expense?.category ?? "general"}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Split
          <select
            name="splitMethod"
            value={splitMethod}
            onChange={(event) => setSplitMethod(event.target.value)}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
          >
            <option value="equal">Equally</option>
            <option value="exact">Exact amounts</option>
          </select>
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-slate-800">
          Split between
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {bill.participants.map((participant) => {
            const selected = selectedIds.includes(participant.id);
            const existingShare = expense?.shares.find(
              (share) => share.participantId === participant.id,
            );
            return (
              <div
                key={participant.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <label className="flex min-h-8 items-center gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    name="participantId"
                    value={participant.id}
                    defaultChecked={selected}
                    onChange={(event) =>
                      toggleParticipant(participant.id, event.target.checked)
                    }
                    className="size-4 accent-teal-700"
                  />
                  {participant.display_name}
                </label>
                {splitMethod === "exact" && selected ? (
                  <label className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
                    Their amount ({bill.currency})
                    <input
                      name={`share-${participant.id}`}
                      inputMode="decimal"
                      defaultValue={
                        existingShare
                          ? moneyInputValue(
                              existingShare.amountMinor,
                              bill.currency,
                            )
                          : ""
                      }
                      placeholder={bill.currency === "KHR" ? "0" : "0.00"}
                      required
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
        {(state.errors?.participantIds ?? state.errors?.shares) ? (
          <p role="alert" className="text-sm text-red-700">
            {state.errors.participantIds ?? state.errors.shares}
          </p>
        ) : null}
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Notes <span className="font-normal text-slate-500">(optional)</span>
        <textarea
          name="notes"
          defaultValue={expense?.notes ?? ""}
          maxLength={1000}
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
        />
        {state.errors?.notes ? (
          <span className="font-normal text-red-700">{state.errors.notes}</span>
        ) : null}
      </label>

      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm font-medium text-teal-700">
          Expense {editing ? "updated" : "added"}.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending
          ? editing
            ? "Saving…"
            : "Adding…"
          : editing
            ? "Save changes"
            : "Add expense"}
      </Button>
    </RetainedForm>
  );
}
