"use client";

import { useId, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { DatePicker } from "@/components/ui/date-picker";
import { formatMoney, parseMoneyToMinor, splitEqually } from "@/lib/money";
import {
  DesignButton,
  DesignCheckbox,
  DesignField,
  DesignSurface,
} from "./primitives";
import { PersonPicker } from "./person-picker";
import styles from "./form-showcase.module.css";

const people = [
  { id: "you", name: "You" },
  { id: "sokha", name: "Sokha" },
  { id: "mali", name: "Mali" },
];
const formats = [
  {
    id: "expense",
    number: "01",
    name: "Everyday form",
    title: "Room for the details.",
    description:
      "An expense drawer on phones. A centered form on larger screens.",
    button: "Preview expense drawer",
    labels: ["Description", "Amount · USD", "Paid by", "Save expense"],
  },
  {
    id: "person",
    number: "02",
    name: "Quick form",
    title: "One small thing at a time.",
    description: "A short drawer for adding a person without leaving the bill.",
    button: "Preview quick form",
    labels: ["Person’s name", "Add person"],
  },
  {
    id: "confirm",
    number: "03",
    name: "Confirmation",
    title: "A moment to be sure.",
    description:
      "A compact centered dialog with a clear consequence and a safe way back.",
    button: "Preview removal dialog",
    labels: ["Remove this expense?", "Cancel", "Remove expense"],
  },
];

export function FormShowcase() {
  const id = useId();
  const [notice, setNotice] = useState("");
  return (
    <div className={styles.showcase}>
      <div className={styles.intro}>
        <p>Three formats. The same foundations.</p>
        <span>Interactive · sample data only</span>
      </div>
      <div className={styles.gallery}>
        {formats.map((format) => (
          <DesignSurface key={format.id} className={styles.card}>
            <p className={styles.eyebrow}>
              {format.number} / {format.name}
            </p>
            <h3>{format.title}</h3>
            <p className={styles.description}>{format.description}</p>
            <div className={styles.miniStage} aria-hidden="true">
              <div
                className={`${styles.miniPanel} ${format.id === "confirm" ? styles.miniConfirm : ""}`}
              >
                {format.id !== "confirm" && (
                  <span className={styles.miniHandle} />
                )}
                {format.labels.map((label, index) => (
                  <span
                    key={label}
                    className={
                      index === format.labels.length - 1
                        ? styles.miniAccent
                        : undefined
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <FormPreview
              format={format}
              id={`${id}-${format.id}`}
              onSaved={setNotice}
            />
          </DesignSurface>
        ))}
      </div>
      <p className={styles.status} role="status">
        {notice || "Try a format. Nothing changes in a real bill."}
      </p>
      <div className={styles.guidance}>
        <p>
          <strong>Keep the action in reach.</strong> The form body scrolls; the
          action footer stays visible. Closing a form keeps its sample draft.
        </p>
        <p>
          <strong>Give long tasks their own screen.</strong> Receipt items and
          assignments belong on a full-screen review page.
        </p>
      </div>
    </div>
  );
}

function FormPreview({ format, id, onSaved }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("Dinner at Malis");
  const [amount, setAmount] = useState("48.00");
  const [payer, setPayer] = useState("you");
  const [date, setDate] = useState("2026-10-29");
  const [selected, setSelected] = useState(people.map((person) => person.id));
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});
  const descriptionInput = useRef(null);
  const amountInput = useRef(null);
  const nameInput = useRef(null);
  const splitGroup = useRef(null);
  let shares = [];
  try {
    if (selected.length)
      shares = splitEqually(parseMoneyToMinor(amount, "USD"), selected);
  } catch {
    /* Invalid sample amounts are explained on submit. */
  }
  const isExpense = format.id === "expense";
  const isConfirm = format.id === "confirm";
  const title = isExpense
    ? "Add an expense"
    : isConfirm
      ? "Remove this expense?"
      : "Add a person";

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (isExpense) {
      if (!description.trim())
        nextErrors.description = "Give the expense a name.";
      try {
        parseMoneyToMinor(amount, "USD");
      } catch {
        nextErrors.amount =
          "Enter an amount greater than zero, with up to two decimal places.";
      }
      if (!selected.length) nextErrors.people = "Choose at least one person.";
    } else if (!isConfirm && !name.trim())
      nextErrors.name = "Enter the person’s name.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      (nextErrors.description
        ? descriptionInput
        : nextErrors.amount
          ? amountInput
          : nextErrors.name
            ? nameInput
            : splitGroup
      ).current?.focus();
      return;
    }
    onSaved(
      isExpense
        ? `Sample expense saved: ${description.trim()}. No real bill changed.`
        : isConfirm
          ? "Sample expense removed. No real bill changed."
          : `${name.trim()} added to the sample preview. No real bill changed.`,
    );
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <DesignButton variant="secondary" icon="arrow" iconPosition="end">
          {format.button}
        </DesignButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.panel}
          data-kind={format.id}
          onOpenAutoFocus={(event) => {
            if (!isConfirm) {
              event.preventDefault();
              (isExpense ? descriptionInput : nameInput).current?.focus();
            }
          }}
        >
          {!isConfirm && <span className={styles.handle} aria-hidden="true" />}
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>WEEKEND DINNER · PREVIEW</p>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {isExpense
                  ? "A little shared, a little simpler."
                  : isConfirm
                    ? "Dinner at Malis · $48.00. Removing it would recalculate everyone’s share."
                    : "They can claim their name when they open the shared bill link."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <DesignButton
                icon="close"
                variant="ghost"
                className={styles.close}
                aria-label="Close form preview"
              />
            </Dialog.Close>
          </div>
          <form noValidate onSubmit={submit} className={styles.form}>
            {!isConfirm && (
              <div className={styles.body}>
                {isExpense ? (
                  <>
                    <DesignField
                      id={`${id}-description`}
                      label="Description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      ref={descriptionInput}
                      error={errors.description}
                      maxLength={120}
                      required
                    />
                    <div className={styles.twoColumns}>
                      <DesignField
                        id={`${id}-amount`}
                        label="Amount · USD"
                        inputMode="decimal"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        ref={amountInput}
                        error={errors.amount}
                        required
                      />
                      <PersonPicker
                        id={`${id}-payer`}
                        label="Paid by"
                        people={people}
                        value={payer}
                        onValueChange={setPayer}
                      />
                    </div>
                    <DatePicker
                      id={`${id}-date`}
                      label="Expense date"
                      value={date}
                      onValueChange={setDate}
                    />
                    <fieldset
                      ref={splitGroup}
                      tabIndex={-1}
                      className={styles.split}
                      aria-describedby={
                        errors.people ? `${id}-people-error` : undefined
                      }
                    >
                      <legend>Split equally between</legend>
                      <div className={styles.choices}>
                        {people.map((person) => (
                          <DesignCheckbox
                            key={person.id}
                            checked={selected.includes(person.id)}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, person.id]
                                  : current.filter(
                                      (value) => value !== person.id,
                                    ),
                              )
                            }
                          >
                            {person.name}
                          </DesignCheckbox>
                        ))}
                      </div>
                      {errors.people && (
                        <p
                          className={styles.error}
                          id={`${id}-people-error`}
                          role="alert"
                        >
                          {errors.people}
                        </p>
                      )}
                    </fieldset>
                    <div
                      className={styles.sharePreview}
                      aria-label="Sample share preview"
                    >
                      <p>Everyone’s share</p>
                      {shares.length ? (
                        shares.map((share) => (
                          <div key={share.participantId}>
                            <span>
                              {
                                people.find(
                                  (person) => person.id === share.participantId,
                                ).name
                              }
                            </span>
                            <strong>
                              {formatMoney(share.amountMinor, "USD")}
                            </strong>
                          </div>
                        ))
                      ) : (
                        <span>
                          Enter an amount and choose people to preview the
                          split.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <DesignField
                    id={`${id}-name`}
                    label="Person’s name"
                    placeholder="e.g. Dara"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    ref={nameInput}
                    error={errors.name}
                    maxLength={60}
                    required
                  />
                )}
              </div>
            )}
            <div className={styles.footer}>
              <p>
                {isConfirm
                  ? "Preview only. No real expense will be removed."
                  : "Sample draft only. Your entries stay here if you close."}
              </p>
              <div className={styles.actions}>
                <Dialog.Close asChild>
                  <DesignButton variant="secondary">Cancel</DesignButton>
                </Dialog.Close>
                <DesignButton
                  type="submit"
                  variant={isConfirm ? "destructive" : "primary"}
                  icon={isConfirm ? undefined : "plus"}
                >
                  {isExpense
                    ? "Save sample expense"
                    : isConfirm
                      ? "Remove sample expense"
                      : "Add sample person"}
                </DesignButton>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
