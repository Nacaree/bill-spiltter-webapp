"use client";

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
    <form action={action} className="grid gap-4">
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
            className="grid gap-2 text-sm font-semibold text-slate-800"
          >
            {label}
            <select
              name={name}
              defaultValue={value ?? ""}
              required
              className="min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-3 font-normal"
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
            </select>
          </label>
        ))}
        <Field
          id={`${prefix}-payment-amount`}
          className="w-full min-w-0"
          label={`Payment amount (${bill.currency})`}
          name="amount"
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
        maxLength={1000}
        defaultValue={settlement?.notes ?? ""}
      />
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          name="confirmed"
          value="yes"
          required
          className="mt-1 size-4 accent-teal-700"
        />
        I confirm this payment already happened outside the app.
      </label>
      {state.errors ? (
        <div role="alert" className="text-sm text-red-700">
          {Object.values(state.errors).map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm font-semibold text-teal-800">
          Payment saved.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : settlement
            ? "Save payment changes"
            : "Record payment"}
      </Button>
    </form>
  );
}

export function RemoveSettlementForm({ settlement, shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(removeSettlementAction, {});
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  return (
    <form
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
    </form>
  );
}
