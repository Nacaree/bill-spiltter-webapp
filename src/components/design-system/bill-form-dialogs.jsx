"use client";

import { useId, useRef, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { SelectControl } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { reviewExpenseDraft } from "@/lib/expense-draft";
import { DesignButton, DesignCheckbox, DesignField } from "./primitives";
import { PersonPicker } from "./person-picker";
import { FormDialog } from "./form-dialog";
import styles from "./form-dialog.module.css";
import system from "./system.module.css";

export function ExpenseFormDialog({
  value,
  onValueChange,
  people,
  onSave,
  allowExact = false,
  categoryOptions,
  submitLabel = "Save expense",
  ...props
}) {
  const id = useId();
  const [errors, setErrors] = useState({});
  const description = useRef(null);
  const amount = useRef(null);
  const payer = useRef(null);
  const date = useRef(null);
  const split = useRef(null);
  const exact = useRef({});
  const review = reviewExpenseDraft(value, people);
  const assigned = review.shares.reduce(
    (total, share) => total + share.amountMinor,
    0,
  );
  function submit(event) {
    event.preventDefault();
    setErrors(review.errors);
    if (Object.keys(review.errors).length) {
      const target = review.errors.description
        ? description.current
        : review.errors.amount
          ? amount.current
          : review.errors.paidBy
            ? payer.current?.querySelector("button")
            : review.errors.date
              ? date.current?.querySelector("button")
              : review.errors.people
                ? split.current
                : review.errors.exact
                  ? exact.current[Object.keys(review.errors.exact)[0]]
                  : split.current;
      target?.focus();
      return;
    }
    onSave({ amountMinor: review.amountMinor, shares: review.shares });
  }
  return (
    <FormDialog
      title="Add an expense"
      description="A little shared, a little simpler."
      {...props}
      kind="expense"
      initialFocusRef={description}
      onSubmit={submit}
      submitLabel={submitLabel}
    >
      <DesignField
        id={`${id}-description`}
        label="Description"
        ref={description}
        value={value.description}
        onChange={(event) => onValueChange({ description: event.target.value })}
        error={errors.description}
        maxLength={120}
        required
      />
      <div className={styles.twoColumns}>
        <DesignField
          id={`${id}-amount`}
          label="Amount · USD"
          ref={amount}
          inputMode="decimal"
          value={value.amount}
          onChange={(event) => onValueChange({ amount: event.target.value })}
          error={errors.amount}
          required
        />
        <div ref={payer}>
          <PersonPicker
            id={`${id}-payer`}
            label="Paid by"
            people={people}
            value={value.paidBy}
            onValueChange={(paidBy) => onValueChange({ paidBy })}
            aria-invalid={Boolean(errors.paidBy)}
            aria-describedby={errors.paidBy ? `${id}-payer-error` : undefined}
          />
          {errors.paidBy && (
            <p className={styles.error} role="alert" id={`${id}-payer-error`}>
              {errors.paidBy}
            </p>
          )}
        </div>
      </div>
      <div ref={date}>
        <DatePicker
          id={`${id}-date`}
          label="Expense date"
          value={value.date}
          onValueChange={(date) => onValueChange({ date })}
          error={errors.date}
          required
        />
      </div>
      <fieldset
        ref={split}
        tabIndex={-1}
        className={styles.split}
        aria-describedby={
          errors.people || errors.splitTotal ? `${id}-split-error` : undefined
        }
      >
        <legend>Split with</legend>
        <div className={styles.choices}>
          {people.map((person) => (
            <DesignCheckbox
              key={person.id}
              checked={value.people.includes(person.id)}
              onChange={(event) =>
                onValueChange({
                  people: event.target.checked
                    ? [...value.people, person.id]
                    : value.people.filter((id) => id !== person.id),
                })
              }
            >
              {person.name ?? person.display_name}
            </DesignCheckbox>
          ))}
        </div>
        {(errors.people || errors.splitTotal) && (
          <p className={styles.error} role="alert" id={`${id}-split-error`}>
            {errors.people || errors.splitTotal}
          </p>
        )}
      </fieldset>
      {allowExact && (
        <div className={styles.methods} role="group" aria-label="Split method">
          {[
            ["equal", "Split equally"],
            ["exact", "Exact amounts"],
          ].map(([method, label]) => (
            <DesignButton
              key={method}
              variant="secondary"
              aria-pressed={value.method === method}
              onClick={() => onValueChange({ method })}
            >
              {label}
            </DesignButton>
          ))}
        </div>
      )}
      {allowExact &&
        value.method === "exact" &&
        value.people.map((personId) => (
          <DesignField
            key={personId}
            id={`${id}-exact-${personId}`}
            label={`${people.find((person) => person.id === personId)?.name ?? people.find((person) => person.id === personId)?.display_name}’s share`}
            inputMode="decimal"
            ref={(node) => {
              exact.current[personId] = node;
            }}
            value={value.exact?.[personId] ?? ""}
            onChange={(event) =>
              onValueChange({
                exact: { ...value.exact, [personId]: event.target.value },
              })
            }
            error={errors.exact?.[personId]}
          />
        ))}
      <div
        className={styles.sharePreview}
        role="region"
        aria-label="Share preview"
      >
        <p>Everyone’s share</p>
        {review.shares.length ? (
          review.shares.map((share) => (
            <div key={share.participantId}>
              <span>
                {people.find((person) => person.id === share.participantId)
                  ?.name ??
                  people.find((person) => person.id === share.participantId)
                    ?.display_name}
              </span>
              <strong>{formatMoney(share.amountMinor, "USD")}</strong>
            </div>
          ))
        ) : (
          <span>Enter an amount and choose people to preview the split.</span>
        )}
        {value.method === "exact" &&
          review.amountMinor !== null &&
          Number.isSafeInteger(assigned) && (
            <span>
              Assigned {formatMoney(assigned, "USD")} of{" "}
              {formatMoney(review.amountMinor, "USD")}
            </span>
          )}
      </div>
      {categoryOptions && (
        <details className={styles.extras}>
          <summary>Category & notes</summary>
          <div className={system.field}>
            <label htmlFor={`${id}-category`}>Category</label>
            {/* Keep long category menus on native scroll; appearing Radix scroll
                buttons can refocus the selected item and jump backward in Safari. */}
            <SelectControl
              scrollButtons={false}
              id={`${id}-category`}
              value={value.category}
              onValueChange={(category) => onValueChange({ category })}
              options={categoryOptions.map((category) => ({
                value: category,
                label: category,
              }))}
            />
          </div>
          <div className={system.field}>
            <label htmlFor={`${id}-notes`}>Notes</label>
            <textarea
              id={`${id}-notes`}
              className={system.input}
              rows={3}
              placeholder="Anything the group should know?"
              value={value.notes}
              onChange={(event) => onValueChange({ notes: event.target.value })}
            />
          </div>
        </details>
      )}
    </FormDialog>
  );
}

export function PersonFormDialog({
  value,
  onValueChange,
  onSave,
  people = [],
  submitLabel = "Add person",
  ...props
}) {
  const id = useId();
  const input = useRef(null);
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const name = value.trim();
    const message = !name
      ? "Enter the person’s name."
      : people.some(
            (person) =>
              (person.name ?? person.display_name).toLowerCase() ===
              name.toLowerCase(),
          )
        ? "That person is already on the bill."
        : "";
    setError(message);
    if (message) {
      input.current?.focus();
      return;
    }
    onSave(name);
  }
  return (
    <FormDialog
      title="Add a person"
      description="They can claim their name when they open the shared bill link."
      {...props}
      kind="person"
      initialFocusRef={input}
      onSubmit={submit}
      submitLabel={submitLabel}
    >
      <DesignField
        id={`${id}-name`}
        label="Person’s name"
        placeholder="e.g. Dara"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        ref={input}
        error={error}
        maxLength={60}
        required
      />
    </FormDialog>
  );
}
