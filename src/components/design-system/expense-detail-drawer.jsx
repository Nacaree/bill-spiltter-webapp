"use client";

import { useId, useRef, useState } from "react";
import { DatePicker, formatPickerDate } from "@/components/ui/date-picker";
import { SelectControl } from "@/components/ui/select";
import { formatMoney, moneyInputValue, splitEqually } from "@/lib/money";
import { reviewExpenseDraft } from "@/lib/expense-draft";
import { DialogPanel } from "./form-dialog";
import { DesignButton, DesignCheckbox, DesignField } from "./primitives";
import { PersonPicker } from "./person-picker";
import { expenseCategories, getExpenseCategory } from "./expense-categories";
import { ReceiptText } from "./icons/receipt-text";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import system from "./system.module.css";
import styles from "./expense-detail-drawer.module.css";

const people = [
  { id: "nary", name: "Nary", initials: "NA" },
  { id: "sokha", name: "Sokha", initials: "SO", tone: "peach" },
  { id: "mali", name: "Mali", initials: "MA", tone: "green" },
];
const money = (amount) => formatMoney(amount, "USD");
const personName = (id) => people.find((person) => person.id === id)?.name;
function participants(expense) {
  return (
    expense.people ??
    people
      .slice(0, expense.share * 2 === expense.amount ? 2 : 3)
      .map((person) => person.id)
  );
}
function draftFor(expense) {
  return {
    description: expense.name,
    amount: moneyInputValue(expense.amount, "USD"),
    paidBy:
      people.find((person) => person.name === expense.payer)?.id ?? "nary",
    date: expense.dateISO ?? `2026-10-${expense.date.slice(0, 2)}`,
    people: participants(expense),
    method: "equal",
    category: getExpenseCategory(expense.category).label,
    notes: expense.notes ?? "",
  };
}

export function ExpenseDetailDrawer({
  expense,
  open,
  onOpenChange,
  onSave,
  onRemove,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const id = useId();
  const [mode, setMode] = useState("details");
  const [draft, setDraft] = useState(() => draftFor(expense));
  const [errors, setErrors] = useState({});
  const initialFocus = useRef(null);
  const description = useRef(null);
  const form = useRef(null);
  const editButton = useRef(null);
  const removeButton = useRef(null);
  const keepButton = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  const category = getExpenseCategory(expense.category, expense.name);
  const draftCategory = getExpenseCategory(draft.category, draft.description);
  const DraftIcon = draftCategory.Icon;
  const Icon = category.Icon;
  const shares =
    expense.shares ?? splitEqually(expense.amount, participants(expense));
  const review = reviewExpenseDraft(draft, people);
  const date = expense.dateISO ?? draftFor(expense).date;

  function changeOpen(next) {
    onOpenChange(next);
  }
  function edit() {
    setDraft(draftFor(expense));
    setErrors({});
    setMode("edit");
    requestAnimationFrame(() =>
      description.current?.focus({ preventScroll: true }),
    );
  }
  function back(target = editButton) {
    setMode("details");
    requestAnimationFrame(() => target.current?.focus({ preventScroll: true }));
  }
  function submit(event) {
    event.preventDefault();
    setErrors(review.errors);
    if (Object.keys(review.errors).length) {
      requestAnimationFrame(() =>
        form.current?.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const calendarDate = new Date(`${draft.date}T12:00:00Z`);
    onSave({
      ...expense,
      name: draft.description.trim(),
      amount: review.amountMinor,
      payer: personName(draft.paidBy),
      share:
        review.shares.find((share) => share.participantId === "nary")
          ?.amountMinor ?? 0,
      people: [...draft.people],
      shares: review.shares,
      category: draft.category,
      dateISO: draft.date,
      date: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
        .format(calendarDate)
        .toUpperCase(),
      year: calendarDate.getUTCFullYear(),
      notes: draft.notes.trim(),
    });
    back();
  }
  const title =
    mode === "edit"
      ? "Edit expense"
      : mode === "remove"
        ? "Remove expense?"
        : mode === "receipt"
          ? "Receipt preview"
          : expense.name;

  return (
    <DialogPanel
      open={open}
      onOpenChange={changeOpen}
      title={title}
      eyebrow="Weekend dinner"
      description={
        mode === "edit"
          ? "A quick change, without leaving the bill."
          : undefined
      }
      closeLabel="Close expense details"
      initialFocusRef={initialFocus}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
      className={styles.drawer}
      viewportAware
      layoutKey={mode}
    >
      {mode === "edit" ? (
        <form ref={form} className={styles.form} noValidate onSubmit={submit}>
          <div className={styles.body}>
            <DesignField
              id={`${id}-name`}
              label="Description"
              ref={description}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              error={errors.description}
              maxLength={120}
              required
            />
            {draftCategory.id === "transport" && (
              <div className={styles.transportHint}>
                <DraftIcon
                  key={draftCategory.icon}
                  size={22}
                  animate={reducedMotion === false}
                  aria-hidden="true"
                  data-detected-transport={draftCategory.icon}
                />
                <span role="status">
                  {draftCategory.transportLabel} icon · matched from the name
                </span>
              </div>
            )}
            <DesignField
              id={`${id}-amount`}
              label="Amount · USD"
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) =>
                setDraft({ ...draft, amount: event.target.value })
              }
              error={errors.amount}
              required
            />
            <PersonPicker
              id={`${id}-payer`}
              label="Paid by"
              people={people}
              value={draft.paidBy}
              onValueChange={(paidBy) => setDraft({ ...draft, paidBy })}
            />
            <DatePicker
              id={`${id}-date`}
              label="Expense date"
              value={draft.date}
              onValueChange={(date) => setDraft({ ...draft, date })}
              error={errors.date}
              required
            />
            <div className={system.field}>
              <label htmlFor={`${id}-category`}>Category</label>
              <SelectControl
                id={`${id}-category`}
                value={draft.category}
                onValueChange={(category) => setDraft({ ...draft, category })}
                options={expenseCategories.map(({ label }) => ({
                  value: label,
                  label,
                }))}
              />
            </div>
            <fieldset
              className={styles.split}
              tabIndex={-1}
              aria-invalid={Boolean(errors.people)}
              aria-describedby={errors.people ? `${id}-split-error` : undefined}
            >
              <legend>Split equally with</legend>
              <div className={styles.choices}>
                {people.map((person) => (
                  <DesignCheckbox
                    key={person.id}
                    checked={draft.people.includes(person.id)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        people: event.target.checked
                          ? [...draft.people, person.id]
                          : draft.people.filter((value) => value !== person.id),
                      })
                    }
                  >
                    {person.name}
                    {person.id === "nary" ? " (you)" : ""}
                  </DesignCheckbox>
                ))}
              </div>
              {errors.people && (
                <p
                  id={`${id}-split-error`}
                  className={styles.error}
                  role="alert"
                >
                  {errors.people}
                </p>
              )}
            </fieldset>
            <div
              className={styles.sharePreview}
              aria-label="Updated split"
              role="region"
            >
              {review.shares.length ? (
                review.shares.map((share) => (
                  <div key={share.participantId}>
                    <span>{personName(share.participantId)}</span>
                    <strong>{money(share.amountMinor)}</strong>
                  </div>
                ))
              ) : (
                <p>Enter an amount and choose people to preview the split.</p>
              )}
            </div>
            <div className={system.field}>
              <label htmlFor={`${id}-notes`}>
                Notes <span className={styles.optional}>optional</span>
              </label>
              <textarea
                id={`${id}-notes`}
                className={system.input}
                rows={3}
                maxLength={500}
                value={draft.notes}
                placeholder="Anything the group should know?"
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </div>
          </div>
          <div className={styles.footer} data-panel-footer>
            <DesignButton variant="secondary" onClick={() => back()}>
              Cancel
            </DesignButton>
            <DesignButton type="submit" icon="check">
              Save changes
            </DesignButton>
          </div>
        </form>
      ) : mode === "remove" ? (
        <>
          <div className={styles.body} ref={initialFocus} tabIndex={-1}>
            <div className={styles.removalSummary}>
              <span>{expense.name}</span>
              <strong>{money(expense.amount)}</strong>
            </div>
            <p className={styles.explanation}>
              This expense and its split will be removed from the bill.
              Everyone’s balance will update.
            </p>
          </div>
          <div className={styles.footer} data-panel-footer>
            <DesignButton
              ref={keepButton}
              variant="secondary"
              onClick={() => back(removeButton)}
            >
              Keep expense
            </DesignButton>
            <DesignButton
              variant="destructive"
              onClick={() => {
                changeOpen(false);
                onRemove(expense);
              }}
            >
              Remove expense
            </DesignButton>
          </div>
        </>
      ) : mode === "receipt" ? (
        <>
          <div className={styles.body} ref={initialFocus} tabIndex={-1}>
            <div className={styles.paper}>
              <ReceiptText size={32} animate={false} aria-hidden="true" />
              <p className={styles.paperLabel}>Sample receipt</p>
              <h3>{expense.name}</h3>
              <p>{formatPickerDate(date)}</p>
              <div>
                <span>Total</span>
                <strong>{money(expense.amount)}</strong>
              </div>
              <p>Thank you for sharing a good time.</p>
            </div>
          </div>
          <div className={styles.footer} data-panel-footer>
            <DesignButton
              variant="secondary"
              onClick={() => {
                setMode("details");
                requestAnimationFrame(() => initialFocus.current?.focus());
              }}
            >
              Back to expense
            </DesignButton>
          </div>
        </>
      ) : (
        <>
          <div className={styles.body} ref={initialFocus} tabIndex={-1}>
            <div className={styles.amountHero}>
              <span className={styles.heroIcon} aria-hidden="true">
                <Icon
                  size={26}
                  animate={false}
                  data-expense-icon={category.icon}
                />
              </span>
              <p>Total expense</p>
              <strong>{money(expense.amount)}</strong>
              <span>
                Your share <b>{money(expense.share)}</b>
              </span>
            </div>
            <dl className={styles.metadata}>
              <div>
                <dt>Paid by</dt>
                <dd>
                  {expense.payer}
                  {expense.payer === "Nary" ? " (you)" : ""}
                </dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatPickerDate(date)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{category.label}</dd>
              </div>
            </dl>
            <div className={styles.shares}>
              <h3>
                Split between {shares.length}{" "}
                {shares.length === 1 ? "person" : "people"}
              </h3>
              {shares.map((share) => (
                <div key={share.participantId}>
                  <span>
                    <i aria-hidden="true">
                      {personName(share.participantId)?.slice(0, 1)}
                    </i>
                    {personName(share.participantId)}
                    {share.participantId === "nary" ? " (you)" : ""}
                  </span>
                  <strong>{money(share.amountMinor)}</strong>
                </div>
              ))}
            </div>
            {expense.notes && (
              <div className={styles.notes}>
                <h3>Notes</h3>
                <p>{expense.notes}</p>
              </div>
            )}
            {expense.receipt ? (
              <button
                type="button"
                className={styles.receipt}
                onClick={() => {
                  setMode("receipt");
                  requestAnimationFrame(() => initialFocus.current?.focus());
                }}
              >
                <ReceiptText size={28} animate={false} aria-hidden="true" />
                <span>
                  <strong>Receipt attached</strong>
                  <span>View sample receipt</span>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <p className={styles.manual}>
                Added manually · no receipt attached
              </p>
            )}
            <button
              type="button"
              ref={removeButton}
              className={styles.remove}
              onClick={() => {
                setMode("remove");
                requestAnimationFrame(() => keepButton.current?.focus());
              }}
            >
              Remove expense
            </button>
          </div>
          <div className={styles.footer} data-panel-footer>
            <DesignButton variant="secondary" onClick={() => changeOpen(false)}>
              Done
            </DesignButton>
            <DesignButton ref={editButton} icon="pencil" onClick={edit}>
              Edit expense
            </DesignButton>
          </div>
        </>
      )}
    </DialogPanel>
  );
}
