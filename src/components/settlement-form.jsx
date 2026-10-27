"use client";

import { SelectControl } from "@/components/ui/select";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createSettlementAction,
  removeSettlementAction,
  updateSettlementAction,
} from "@/app/settlement-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { moneyInputValue } from "@/lib/money";

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function SettlementForm({ bill, settlementId, settlement, transfer }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    settlement ? updateSettlementAction : createSettlementAction,
    {},
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  const prefix = settlement?.id ?? settlementId;
  return (
    <RetainedForm state={state} action={action} className="grid gap-4">
      <input type="hidden" name="shareToken" value={bill.shareToken} />
      <input type="hidden" name="settlementId" value={prefix} />
      {settlement ? (
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={settlement.updated_at}
        />
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          [
            "fromParticipantId",
            "Sent by",
            settlement?.from_participant_id ??
              transfer?.fromParticipantId ??
              bill.currentParticipantId,
          ],
          [
            "toParticipantId",
            "Received by",
            settlement?.to_participant_id ?? transfer?.toParticipantId,
          ],
        ].map(([name, label, value]) => (
          <label
            key={name}
            className="text-foreground grid gap-2 text-sm font-semibold"
          >
            {label}
            <SelectControl
              person
              aria-label={label}
              name={name}
              aria-invalid={Boolean(state.errors?.[name])}
              aria-describedby={
                state.errors?.[name] ? `${prefix}-${name}-error` : undefined
              }
              defaultValue={value ?? ""}
              required
            >
              <option value="" disabled>
                Choose a person
              </option>
              {bill.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                  {p.deactivated_at ? " (inactive)" : ""}
                </option>
              ))}
            </SelectControl>
            {state.errors?.[name] ? (
              <span
                id={`${prefix}-${name}-error`}
                className="font-normal text-red-700"
              >
                {state.errors[name]}
              </span>
            ) : null}
          </label>
        ))}
        <Field
          id={`${prefix}-payment-amount`}
          className="w-full min-w-0"
          label={`Payment amount (${bill.currency})`}
          name="amount"
          error={state.errors?.amount}
          inputMode="decimal"
          required
          defaultValue={
            settlement
              ? moneyInputValue(settlement.amount_minor, bill.currency)
              : transfer
                ? moneyInputValue(transfer.amountMinor, bill.currency)
                : undefined
          }
        />
        <Field
          id={`${prefix}-payment-date`}
          className="w-full min-w-0"
          label="Payment date"
          name="settledDate"
          error={state.errors?.settledDate}
          type="date"
          required
          defaultValue={settlement?.settled_at.slice(0, 10) ?? localDate()}
        />
      </div>
      <Field
        id={`${prefix}-payment-notes`}
        className="w-full min-w-0"
        label="Payment notes (optional)"
        name="notes"
        error={state.errors?.notes}
        maxLength={1000}
        defaultValue={settlement?.notes ?? ""}
      />
      <label className="text-foreground flex min-h-11 items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="confirmed"
          aria-invalid={Boolean(state.errors?.confirmed)}
          aria-describedby={
            state.errors?.confirmed ? `${prefix}-confirmed-error` : undefined
          }
          value="yes"
          required
          className="accent-brand mt-1 size-4"
        />
        I confirm this payment already happened outside the app.
      </label>
      {state.errors?.confirmed ? (
        <p
          id={`${prefix}-confirmed-error`}
          role="alert"
          className="text-sm text-red-700"
        >
          {state.errors.confirmed}
        </p>
      ) : null}
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-brand text-sm font-semibold">
          Payment saved.
        </p>
      ) : null}
      <Button icon="check" type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : settlement
            ? "Save payment changes"
            : "Record payment"}
      </Button>
    </RetainedForm>
  );
}

export function RemoveSettlementForm({ settlement, shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(removeSettlementAction, {});
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  return (
    <RetainedForm
      state={state}
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Remove this payment record? Balances will be recalculated. This does not reverse a bank transfer.",
          )
        )
          event.preventDefault();
      }}
      className="mt-4 grid gap-2"
    >
      <input type="hidden" name="shareToken" value={shareToken} />
      <input type="hidden" name="settlementId" value={settlement.id} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={settlement.updated_at}
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Removing…" : "Remove payment record"}
      </Button>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
    </RetainedForm>
  );
}
