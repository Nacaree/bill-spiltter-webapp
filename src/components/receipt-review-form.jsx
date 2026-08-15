"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmReceiptAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";
import { formatMoney, moneyInputValue, parseMoneyToMinor } from "@/lib/money";

const initialState = { errors: null };

function inputMoney(value, currency) {
  return value === null || value === undefined
    ? moneyInputValue(0, currency)
    : moneyInputValue(value, currency);
}

export function ReceiptReviewForm({ bill, confirmationKey, scan }) {
  const router = useRouter();
  const allParticipantIds = useMemo(
    () => bill.participants.map((person) => person.id),
    [bill.participants],
  );
  const [items, setItems] = useState(() =>
    scan.items.map((item) => ({
      ...item,
      assignments: allParticipantIds,
      clientKey: item.id,
      totalInput: inputMoney(item.total_minor, bill.currency),
    })),
  );
  const [totalInput, setTotalInput] = useState(
    scan.total_minor === null
      ? ""
      : inputMoney(scan.total_minor, bill.currency),
  );
  const [adjustmentMethod, setAdjustmentMethod] = useState("proportional");
  const [state, action, pending] = useActionState(
    confirmReceiptAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.push(`/b/${bill.shareToken}`);
  }, [bill.shareToken, router, state]);

  let totalMinor = null;
  try {
    totalMinor = parseMoneyToMinor(totalInput, bill.currency);
  } catch {
    totalMinor = null;
  }
  const itemTotal = items.reduce((sum, item) => {
    try {
      return sum + parseMoneyToMinor(item.totalInput, bill.currency);
    } catch {
      return sum;
    }
  }, 0);
  const difference = totalMinor === null ? null : totalMinor - itemTotal;

  function updateItem(clientKey, changes) {
    setItems((current) =>
      current.map((item) =>
        item.clientKey === clientKey ? { ...item, ...changes } : item,
      ),
    );
  }

  function toggleAssignment(clientKey, participantId, checked) {
    setItems((current) =>
      current.map((item) => {
        if (item.clientKey !== clientKey) return item;
        return {
          ...item,
          assignments: checked
            ? [...item.assignments, participantId]
            : item.assignments.filter((id) => id !== participantId),
        };
      }),
    );
  }

  return (
    <form action={action} className="grid gap-7">
      <input type="hidden" name="shareToken" value={bill.shareToken} />
      <input type="hidden" name="receiptScanId" value={scan.id} />
      <input type="hidden" name="confirmationKey" value={confirmationKey} />
      <input type="hidden" name="itemCount" value={items.length} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Expense description
          <input
            name="description"
            defaultValue={scan.merchant_name || "Receipt"}
            maxLength={120}
            required
            className="min-h-12 rounded-xl border border-slate-300 px-4 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Merchant
          <input
            name="merchantName"
            defaultValue={scan.merchant_name ?? ""}
            maxLength={120}
            className="min-h-12 rounded-xl border border-slate-300 px-4 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Date
          <input
            type="date"
            name="expenseDate"
            defaultValue={
              scan.receipt_date ?? new Date().toISOString().slice(0, 10)
            }
            required
            className="min-h-12 rounded-xl border border-slate-300 px-4 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Paid by
          <select
            name="paidByParticipantId"
            defaultValue={bill.currentParticipantId}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal"
          >
            {bill.participants.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Category
          <select
            name="category"
            defaultValue="general"
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <legend className="text-lg font-bold text-slate-950">
              Receipt items
            </legend>
            <p className="mt-1 text-sm text-slate-600">
              Fix each line and choose everyone who shared it.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  assignments: allParticipantIds,
                  clientKey: crypto.randomUUID(),
                  confidence_basis_points: null,
                  description: "",
                  needs_review: false,
                  totalInput: "",
                },
              ])
            }
            className="text-sm font-semibold text-teal-700"
          >
            + Add item
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={item.clientKey}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-slate-800">
                Item {index + 1}
              </p>
              <div className="flex items-center gap-3">
                {item.needs_review ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                    Low confidence
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter(
                        (entry) => entry.clientKey !== item.clientKey,
                      ),
                    )
                  }
                  className="text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_10rem]">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Description
                <input
                  name={`item-${index}-description`}
                  value={item.description}
                  onChange={(event) =>
                    updateItem(item.clientKey, {
                      description: event.target.value,
                    })
                  }
                  maxLength={160}
                  required
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Line total ({bill.currency})
                <input
                  name={`item-${index}-total`}
                  value={item.totalInput}
                  onChange={(event) =>
                    updateItem(item.clientKey, {
                      totalInput: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"
                />
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold text-slate-700">
                Shared by
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {bill.participants.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name={`item-${index}-participant`}
                      value={person.id}
                      checked={item.assignments.includes(person.id)}
                      onChange={(event) =>
                        toggleAssignment(
                          item.clientKey,
                          person.id,
                          event.target.checked,
                        )
                      }
                      className="size-4 accent-teal-700"
                    />
                    {person.display_name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
        {state.errors?.items ? (
          <p role="alert" className="text-sm text-red-700">
            {state.errors.items}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5">
        <legend className="px-1 text-lg font-bold text-slate-950">
          Receipt totals
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["subtotal", "Subtotal", scan.subtotal_minor ?? itemTotal],
            ["tax", "Tax", scan.tax_minor ?? 0],
            ["tip", "Tip", scan.tip_minor ?? 0],
            ["discount", "Discount", scan.discount_minor ?? 0],
          ].map(([name, label, value]) => (
            <label
              key={name}
              className="grid gap-1 text-xs font-semibold text-slate-700"
            >
              {label}
              <input
                name={name}
                defaultValue={inputMoney(value, bill.currency)}
                inputMode="decimal"
                required
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-normal"
              />
            </label>
          ))}
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Printed total
            <input
              name="total"
              value={totalInput}
              onChange={(event) => setTotalInput(event.target.value)}
              inputMode="decimal"
              required
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-normal"
            />
          </label>
        </div>
        {difference !== null && difference !== 0 ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            Item totals differ from the printed total by{" "}
            <strong>{formatMoney(Math.abs(difference), bill.currency)}</strong>.
            Choose how to allocate that adjustment below.
          </div>
        ) : (
          <p className="text-sm font-medium text-teal-700">
            Item totals match the receipt total.
          </p>
        )}
        {state.errors?.totals ? (
          <p role="alert" className="text-sm text-red-700">
            {state.errors.totals}
          </p>
        ) : null}
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Allocate tax, tip, discount, and rounding difference
        <select
          name="adjustmentMethod"
          value={adjustmentMethod}
          onChange={(event) => setAdjustmentMethod(event.target.value)}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal"
        >
          <option value="proportional">Proportionally to assigned items</option>
          <option value="equal">Equally between included people</option>
          <option value="custom">Custom amounts</option>
        </select>
      </label>
      {adjustmentMethod === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bill.participants.map((person) => (
            <label
              key={person.id}
              className="grid gap-1 text-xs font-semibold text-slate-700"
            >
              {person.display_name} adjustment ({bill.currency})
              <input
                name={`adjustment-${person.id}`}
                defaultValue={inputMoney(0, bill.currency)}
                placeholder="Use - for a discount"
                required
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-normal"
              />
            </label>
          ))}
        </div>
      ) : null}
      {state.errors?.allocation ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.allocation}
        </p>
      ) : null}
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || items.length === 0}>
        {pending ? "Confirming…" : "Confirm and add expense"}
      </Button>
      <p className="text-xs leading-5 text-slate-500">
        Nothing affects balances until this confirmation succeeds.
      </p>
    </form>
  );
}
