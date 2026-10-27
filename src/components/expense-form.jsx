"use client";

import { SelectControl } from "@/components/ui/select";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, updateExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DesignCheckbox } from "@/components/design-system/primitives";
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
  const prefix = useId();
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
    async (previous, formData) => {
      const save = editing ? updateExpenseAction : createExpenseAction;
      const result = await save(previous, formData);
      if (result?.success) setSelectedIds(defaultParticipantIds);
      return result;
    },
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
    <RetainedForm state={state} action={action} className="grid gap-3">
      <input type="hidden" name="shareToken" value={bill.shareToken} />
      {editing ? (
        <input type="hidden" name="expenseId" value={expense.id} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${prefix}-description`}
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
          id={`${prefix}-amount`}
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
        <label className="text-foreground grid gap-2 text-sm font-semibold">
          Paid by
          <SelectControl
            person
            aria-label="Paid by"
            name="paidByParticipantId"
            aria-invalid={Boolean(state.errors?.paidByParticipantId)}
            aria-describedby={
              state.errors?.paidByParticipantId
                ? `${prefix}-paidByParticipantId-error`
                : undefined
            }
            defaultValue={
              expense?.paid_by_participant_id ?? bill.currentParticipantId
            }
          >
            {bill.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.display_name}
              </option>
            ))}
          </SelectControl>
          {state.errors?.paidByParticipantId ? (
            <span
              id={`${prefix}-paidByParticipantId-error`}
              className="font-normal text-red-700"
            >
              {state.errors.paidByParticipantId}
            </span>
          ) : null}
        </label>
        <label className="text-foreground grid gap-2 text-sm font-semibold">
          Date
          <input
            type="date"
            name="expenseDate"
            aria-invalid={Boolean(state.errors?.expenseDate)}
            aria-describedby={
              state.errors?.expenseDate
                ? `${prefix}-expenseDate-error`
                : undefined
            }
            defaultValue={
              expense?.expense_date ?? defaults?.expenseDate ?? today()
            }
            required
            className="rounded-control border-line focus:border-brand min-h-12 border bg-white px-4 text-base font-normal shadow-sm outline-none"
          />
          {state.errors?.expenseDate ? (
            <span
              id={`${prefix}-expenseDate-error`}
              className="font-normal text-red-700"
            >
              {state.errors.expenseDate}
            </span>
          ) : null}
        </label>
        <label className="text-foreground grid gap-2 text-sm font-semibold">
          Category
          <SelectControl
            aria-label="Category"
            name="category"
            defaultValue={expense?.category ?? "general"}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </SelectControl>
        </label>
        <label className="text-foreground grid gap-2 text-sm font-semibold">
          Split
          <SelectControl
            aria-label="Split"
            name="splitMethod"
            value={splitMethod}
            onChange={(event) => setSplitMethod(event.target.value)}
          >
            <option value="equal">Equally</option>
            <option value="exact">Exact amounts</option>
          </SelectControl>
        </label>
      </div>

      <fieldset
        className="grid min-w-0 gap-3"
        tabIndex={
          state.errors?.participantIds || state.errors?.shares ? -1 : undefined
        }
        aria-invalid={Boolean(
          state.errors?.participantIds || state.errors?.shares,
        )}
        aria-describedby={
          state.errors?.participantIds || state.errors?.shares
            ? `${prefix}-shares-error`
            : undefined
        }
      >
        <legend className="text-foreground mb-3 text-sm font-semibold">
          Split between
        </legend>
        <div className="flex flex-wrap gap-3">
          {bill.participants.map((participant) => {
            const selected = selectedIds.includes(participant.id);
            const existingShare = expense?.shares.find(
              (share) => share.participantId === participant.id,
            );
            return (
              <div
                key={participant.id}
                className={
                  splitMethod === "exact"
                    ? "rounded-control border-line bg-canvas grid min-w-0 flex-1 basis-full gap-2 border p-4 sm:basis-[calc(50%-0.75rem)]"
                    : "contents"
                }
              >
                <DesignCheckbox
                  name="participantId"
                  value={participant.id}
                  checked={selected}
                  onChange={(event) =>
                    toggleParticipant(participant.id, event.target.checked)
                  }
                >
                  {participant.display_name}
                </DesignCheckbox>
                {splitMethod === "exact" && selected ? (
                  <label className="text-muted mt-2 grid gap-1 text-xs font-semibold">
                    {participant.display_name}’s amount ({bill.currency})
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
                      className="border-line focus:border-brand rounded-control min-h-10 border bg-white px-3 text-sm font-normal outline-none"
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
        {(state.errors?.participantIds ?? state.errors?.shares) ? (
          <p
            id={`${prefix}-shares-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {state.errors.participantIds ?? state.errors.shares}
          </p>
        ) : null}
      </fieldset>

      <label className="text-foreground grid gap-2 text-sm font-semibold">
        Notes <span className="text-muted font-normal">(optional)</span>
        <textarea
          name="notes"
          aria-invalid={Boolean(state.errors?.notes)}
          aria-describedby={
            state.errors?.notes ? `${prefix}-notes-error` : undefined
          }
          defaultValue={expense?.notes ?? ""}
          maxLength={1000}
          rows={3}
          className="rounded-control border-line focus:border-brand border bg-white px-4 py-3 text-base font-normal shadow-sm outline-none"
        />
        {state.errors?.notes ? (
          <span
            id={`${prefix}-notes-error`}
            className="font-normal text-red-700"
          >
            {state.errors.notes}
          </span>
        ) : null}
      </label>

      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-brand text-sm font-medium">
          Expense {editing ? "updated" : "added"}.
        </p>
      ) : null}
      <Button icon="check" type="submit" disabled={pending}>
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
