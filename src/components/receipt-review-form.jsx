"use client";

import { DesignCheckbox } from "@/components/design-system/primitives";
import { SelectControl } from "@/components/ui/select";

import { RetainedForm } from "@/components/retained-form";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { confirmReceiptAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";
import { formatMoney, moneyInputValue, parseMoneyToMinor } from "@/lib/money";
import { receiptLineTotal } from "@/lib/receipt-item-price";

const initialState = { errors: null };

function inputMoney(value, currency) {
  return value === null || value === undefined
    ? moneyInputValue(0, currency)
    : moneyInputValue(value, currency);
}

function readMoney(value, currency, allowZero = false) {
  try {
    return parseMoneyToMinor(value, currency, { allowZero });
  } catch {
    return null;
  }
}

export function ReceiptReviewForm({ bill, confirmationKey, scan }) {
  const router = useRouter();
  const prefix = useId();
  const addButton = useRef(null);
  const itemInputs = useRef(new Map());
  const focusItem = useRef(null);
  const allParticipantIds = useMemo(
    () => bill.participants.map((person) => person.id),
    [bill.participants],
  );
  const [items, setItems] = useState(() =>
    scan.items.map((item) => ({
      ...item,
      assignments: allParticipantIds,
      clientKey: item.id,
      quantity: item.quantity ?? 1,
      unitPriceInput:
        item.unit_price_minor === null || item.unit_price_minor === undefined
          ? ""
          : inputMoney(item.unit_price_minor, bill.currency),
      totalInput: inputMoney(item.total_minor, bill.currency),
    })),
  );
  const [totalInput, setTotalInput] = useState(
    scan.total_minor === null
      ? ""
      : inputMoney(scan.total_minor, bill.currency),
  );
  const [summaryInputs, setSummaryInputs] = useState(() => ({
    subtotal: inputMoney(
      scan.subtotal_minor ??
        scan.items.reduce((sum, item) => sum + item.total_minor, 0),
      bill.currency,
    ),
    tax: inputMoney(scan.tax_minor, bill.currency),
    tip: inputMoney(scan.tip_minor, bill.currency),
    discount: inputMoney(scan.discount_minor, bill.currency),
  }));
  const [adjustmentMethod, setAdjustmentMethod] = useState("proportional");
  const [state, action, pending] = useActionState(
    confirmReceiptAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.push(`/b/${bill.shareToken}`);
  }, [bill.shareToken, router, state]);

  useEffect(() => {
    if (!focusItem.current) return;
    if (focusItem.current === "add") addButton.current?.focus();
    else itemInputs.current.get(focusItem.current)?.focus();
    focusItem.current = null;
  }, [items]);

  function addItem() {
    const clientKey = crypto.randomUUID();
    focusItem.current = clientKey;
    setItems((current) => [
      ...current,
      {
        assignments: allParticipantIds,
        clientKey,
        confidence_basis_points: null,
        description: "",
        needs_review: false,
        quantity: 1,
        unit_price_minor: null,
        unitPriceInput: "",
        totalInput: "",
      },
    ]);
  }

  function removeItem(index) {
    focusItem.current =
      items[index + 1]?.clientKey ?? items[index - 1]?.clientKey ?? "add";
    setItems((current) =>
      current.filter((item) => item.clientKey !== items[index].clientKey),
    );
  }

  const totalMinor = readMoney(totalInput, bill.currency);
  const itemAmounts = items.map((item) =>
    readMoney(item.totalInput, bill.currency),
  );
  const sum = itemAmounts.reduce((total, amount) => total + (amount ?? 0), 0);
  const itemTotal =
    items.length && !itemAmounts.includes(null) && Number.isSafeInteger(sum)
      ? sum
      : null;
  const summary = Object.fromEntries(
    Object.entries(summaryInputs).map(([key, value]) => [
      key,
      readMoney(value, bill.currency, true),
    ]),
  );
  const summariesValid = Object.values(summary).every(
    (amount) => amount !== null,
  );
  const adjustment = summariesValid
    ? summary.tax + summary.tip - summary.discount
    : null;
  const calculatedTotal =
    adjustment === null ? null : summary.subtotal + adjustment;
  const calculatedItemTotal =
    adjustment === null || itemTotal === null ? null : itemTotal + adjustment;
  const totalsValid =
    totalMinor !== null &&
    itemTotal !== null &&
    summariesValid &&
    items.every(
      (item) =>
        !item.unitPriceInput?.trim() ||
        readMoney(item.unitPriceInput, bill.currency, true) !== null,
    ) &&
    Number.isSafeInteger(calculatedTotal) &&
    calculatedTotal >= 0 &&
    Number.isSafeInteger(calculatedItemTotal) &&
    calculatedItemTotal >= 0;
  const subtotalDifference = totalsValid ? summary.subtotal - itemTotal : null;
  const summaryDifference = totalsValid ? totalMinor - calculatedTotal : null;
  const unexplainedDifference = totalsValid
    ? totalMinor - calculatedItemTotal
    : null;
  const totalsMatch =
    totalsValid && subtotalDifference === 0 && summaryDifference === 0;

  function updateItem(clientKey, changes) {
    setItems((current) =>
      current.map((item) =>
        item.clientKey === clientKey ? { ...item, ...changes } : item,
      ),
    );
  }

  function updateUnitPrice(item, value) {
    const unitPriceMinor = readMoney(value, bill.currency, true);
    const changes = { unitPriceInput: value };
    if (unitPriceMinor !== null) {
      try {
        changes.totalInput = inputMoney(
          receiptLineTotal(unitPriceMinor, item.quantity),
          bill.currency,
        );
      } catch {
        changes.totalInput = "";
      }
    }
    updateItem(item.clientKey, changes);
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
    <RetainedForm state={state} action={action} className="grid min-w-0 gap-7">
      <input type="hidden" name="shareToken" value={bill.shareToken} />
      <input type="hidden" name="receiptScanId" value={scan.id} />
      <input type="hidden" name="confirmationKey" value={confirmationKey} />
      <input type="hidden" name="itemCount" value={items.length} />

      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
          Expense description
          <input
            name="description"
            defaultValue={scan.merchant_name || "Receipt"}
            maxLength={120}
            required
            className="rounded-control border-line min-h-12 w-full min-w-0 border px-4 font-normal"
          />
        </label>
        <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
          Merchant
          <input
            name="merchantName"
            defaultValue={scan.merchant_name ?? ""}
            maxLength={120}
            className="rounded-control border-line min-h-12 w-full min-w-0 border px-4 font-normal"
          />
        </label>
        <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
          Date
          <input
            type="date"
            name="expenseDate"
            defaultValue={
              scan.receipt_date ?? new Date().toISOString().slice(0, 10)
            }
            required
            className="rounded-control border-line min-h-12 w-full min-w-0 border px-4 font-normal"
          />
        </label>
        <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
          Paid by
          <SelectControl
            person
            aria-label="Paid by"
            name="paidByParticipantId"
            defaultValue={bill.currentParticipantId}
          >
            {bill.participants.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </SelectControl>
        </label>
        <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
          Category
          <SelectControl
            aria-label="Category"
            name="category"
            defaultValue="general"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </SelectControl>
        </label>
      </div>

      <fieldset
        className="grid min-w-0 gap-4"
        aria-invalid={Boolean(state.errors?.items)}
        aria-describedby={
          state.errors?.items ? `${prefix}-items-error` : undefined
        }
        tabIndex={state.errors?.items ? -1 : undefined}
      >
        <legend className="text-foreground text-lg font-bold">
          Receipt items
        </legend>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted mt-1 text-sm">
              Fix each line and choose everyone who shared it.
            </p>
          </div>
          <button
            type="button"
            ref={addButton}
            onClick={addItem}
            className="text-brand min-h-11 px-2 text-sm font-semibold"
          >
            + Add item
          </button>
        </div>

        {items.map((item, index) => (
          <fieldset
            key={item.clientKey}
            className="rounded-control border-line bg-canvas @container min-w-0 border p-4"
          >
            <legend className="sr-only">Item {index + 1}</legend>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-foreground text-sm font-bold">
                Item {index + 1}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {item.needs_review ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                    Low confidence
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove item ${index + 1}`}
                  className="min-h-11 min-w-11 px-2 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-3 grid min-w-0 grid-cols-2 items-start gap-4 @md:grid-cols-[minmax(0,1fr)_8rem_8rem]">
              <input
                type="hidden"
                name={`item-${index}-quantity`}
                value={item.quantity ?? 1}
              />
              <label className="text-foreground col-span-2 grid min-w-0 gap-1 text-xs font-semibold @md:col-span-1">
                Description
                <input
                  ref={(node) => {
                    if (node) itemInputs.current.set(item.clientKey, node);
                    else itemInputs.current.delete(item.clientKey);
                  }}
                  name={`item-${index}-description`}
                  value={item.description}
                  onChange={(event) =>
                    updateItem(item.clientKey, {
                      description: event.target.value,
                    })
                  }
                  maxLength={160}
                  required
                  className="rounded-control border-line min-h-11 w-full min-w-0 border bg-white px-3 text-sm font-normal"
                />
              </label>
              <label className="text-foreground grid min-w-0 gap-1 text-xs font-semibold">
                Unit price ({bill.currency})
                <input
                  name={`item-${index}-unit-price`}
                  value={
                    item.unitPriceInput ??
                    (item.unit_price_minor === null ||
                    item.unit_price_minor === undefined
                      ? ""
                      : inputMoney(item.unit_price_minor, bill.currency))
                  }
                  onChange={(event) =>
                    updateUnitPrice(item, event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="Not read"
                  className="rounded-control border-line min-h-11 w-full min-w-0 border bg-white px-3 text-sm font-normal"
                />
                {item.quantity !== null && item.quantity !== undefined ? (
                  <span className="text-muted font-normal">
                    Quantity: {item.quantity}
                  </span>
                ) : null}
              </label>
              <label className="text-foreground grid min-w-0 gap-1 text-xs font-semibold">
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
                  className="rounded-control border-line min-h-11 w-full min-w-0 border bg-white px-3 text-sm font-normal"
                />
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="text-foreground text-xs font-semibold">
                Shared by
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {bill.participants.map((person) => (
                  <DesignCheckbox
                    key={person.id}
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
                  >
                    {person.display_name}
                  </DesignCheckbox>
                ))}
              </div>
            </fieldset>
          </fieldset>
        ))}
        {state.errors?.items ? (
          <p
            id={`${prefix}-items-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {state.errors.items}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="rounded-control border-line grid min-w-0 gap-4 border p-5"
        aria-invalid={Boolean(state.errors?.totals)}
        aria-describedby={
          state.errors?.totals ? `${prefix}-totals-error` : undefined
        }
        tabIndex={state.errors?.totals ? -1 : undefined}
      >
        <legend className="text-foreground px-1 text-lg font-bold">
          Receipt totals
        </legend>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-4">
          {[
            ["subtotal", "Subtotal"],
            ["tax", "Tax"],
            ["tip", "Tip"],
            ["discount", "Discount"],
          ].map(([name, label]) => (
            <label
              key={name}
              className="text-foreground grid min-w-0 gap-1 text-xs font-semibold"
            >
              {label}
              <input
                name={name}
                value={summaryInputs[name]}
                onChange={(event) =>
                  setSummaryInputs((current) => ({
                    ...current,
                    [name]: event.target.value,
                  }))
                }
                inputMode="decimal"
                required
                className="rounded-control border-line min-h-11 w-full min-w-0 border px-3 text-sm font-normal"
              />
            </label>
          ))}
          <label className="text-foreground grid min-w-0 gap-1 text-xs font-semibold">
            Printed total
            <input
              name="total"
              value={totalInput}
              onChange={(event) => setTotalInput(event.target.value)}
              inputMode="decimal"
              required
              className="rounded-control border-line min-h-11 w-full min-w-0 border px-3 text-sm font-normal"
            />
          </label>
        </div>
        {totalsValid ? (
          <p className="text-muted text-sm">
            {formatMoney(itemTotal, bill.currency)} items
            {summary.tax > 0
              ? ` + ${formatMoney(summary.tax, bill.currency)} tax`
              : ""}
            {summary.tip > 0
              ? ` + ${formatMoney(summary.tip, bill.currency)} tip`
              : ""}
            {summary.discount > 0
              ? ` − ${formatMoney(summary.discount, bill.currency)} discount`
              : ""}
            {` = ${formatMoney(calculatedItemTotal, bill.currency)}`}
          </p>
        ) : null}
        {totalsMatch ? (
          <p className="text-brand text-sm font-medium" role="status">
            Items and adjustments match the printed total.
          </p>
        ) : totalsValid ? (
          <div
            className="rounded-control grid min-w-0 gap-2 bg-amber-50 p-4 text-sm text-amber-950"
            role="status"
          >
            {subtotalDifference !== 0 ? (
              <p>
                Item amounts differ from the subtotal by{" "}
                <strong>
                  {formatMoney(Math.abs(subtotalDifference), bill.currency)}
                </strong>
                . Check for missing or incorrect items.
              </p>
            ) : null}
            {unexplainedDifference !== 0 ? (
              <p>
                After tax, tip, and discount, item amounts differ from the
                printed total by{" "}
                <strong>
                  {formatMoney(Math.abs(unexplainedDifference), bill.currency)}
                </strong>
                . Review the amounts; any remaining difference will be allocated
                below.
              </p>
            ) : summaryDifference !== 0 ? (
              <p>
                Subtotal, tax, tip, and discount differ from the printed total
                by{" "}
                <strong>
                  {formatMoney(Math.abs(summaryDifference), bill.currency)}
                </strong>
                . Check the subtotal above.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted text-sm" role="status">
            Enter valid item amounts and receipt totals to check the
            calculation.
          </p>
        )}
        {state.errors?.totals ? (
          <p
            id={`${prefix}-totals-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {state.errors.totals}
          </p>
        ) : null}
      </fieldset>

      <label className="text-foreground grid min-w-0 gap-2 text-sm font-semibold">
        Allocate tax, tip, discount, and rounding difference
        <SelectControl
          aria-label="Allocate tax, tip, discount, and rounding difference"
          name="adjustmentMethod"
          aria-invalid={Boolean(state.errors?.allocation)}
          aria-describedby={
            state.errors?.allocation ? `${prefix}-allocation-error` : undefined
          }
          value={adjustmentMethod}
          onChange={(event) => setAdjustmentMethod(event.target.value)}
        >
          <option value="proportional">Proportionally to assigned items</option>
          <option value="equal">Equally between included people</option>
          <option value="custom">Custom amounts</option>
        </SelectControl>
      </label>
      {adjustmentMethod === "custom" ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {bill.participants.map((person) => (
            <label
              key={person.id}
              className="text-foreground grid min-w-0 gap-1 text-xs font-semibold"
            >
              {person.display_name} adjustment ({bill.currency})
              <input
                name={`adjustment-${person.id}`}
                defaultValue={inputMoney(0, bill.currency)}
                placeholder="Use - for a discount"
                required
                className="rounded-control border-line min-h-11 w-full min-w-0 border px-3 text-sm font-normal"
              />
            </label>
          ))}
        </div>
      ) : null}
      {state.errors?.allocation ? (
        <p
          id={`${prefix}-allocation-error`}
          role="alert"
          className="text-sm text-red-700"
        >
          {state.errors.allocation}
        </p>
      ) : null}
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}

      <Button
        icon="check"
        type="submit"
        disabled={pending || items.length === 0}
      >
        {pending ? "Confirming…" : "Confirm and add expense"}
      </Button>
      <p className="text-muted text-xs leading-5">
        Nothing affects balances until this confirmation succeeds.
      </p>
    </RetainedForm>
  );
}
