"use client";

import { useState } from "react";
import { DesignButton, DesignSurface } from "./primitives";
import { FormDialog } from "./form-dialog";
import { ExpenseFormDialog, PersonFormDialog } from "./bill-form-dialogs";
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
            <FormPreview format={format} onSaved={setNotice} />
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

function FormPreview({ format, onSaved }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    description: "Dinner at Malis",
    amount: "48.00",
    paidBy: "you",
    date: "2026-10-29",
    people: people.map((person) => person.id),
    method: "equal",
    exact: {},
    category: "Food & drinks",
    notes: "",
  });
  const [name, setName] = useState("");
  const trigger = (
    <DesignButton variant="secondary" icon="arrow" iconPosition="end">
      {format.button}
    </DesignButton>
  );
  const common = {
    open,
    onOpenChange: setOpen,
    trigger,
    eyebrow: "Weekend dinner · Preview",
    closeLabel: "Close form preview",
    footerNote: "Sample draft only. Your entries stay here if you close.",
  };
  if (format.id === "expense")
    return (
      <ExpenseFormDialog
        {...common}
        value={draft}
        onValueChange={(changes) =>
          setDraft((current) => ({ ...current, ...changes }))
        }
        people={people}
        allowExact
        categoryOptions={["Food & drinks", "Transport", "Shopping", "Other"]}
        submitLabel="Save sample expense"
        onSave={() => {
          onSaved(
            `Sample expense saved: ${draft.description.trim()}. No real bill changed.`,
          );
          setOpen(false);
        }}
      />
    );
  if (format.id === "person")
    return (
      <PersonFormDialog
        {...common}
        value={name}
        onValueChange={setName}
        people={people}
        submitLabel="Add sample person"
        onSave={(name) => {
          onSaved(`${name} added to the sample preview. No real bill changed.`);
          setOpen(false);
        }}
      />
    );
  return (
    <FormDialog
      {...common}
      kind="confirm"
      title="Remove this expense?"
      description="Dinner at Malis · $48.00. Removing it would recalculate everyone’s share."
      footerNote="Preview only. No real expense will be removed."
      cancelLabel="Cancel"
      submitIcon={null}
      submitLabel="Remove sample expense"
      onSubmit={(event) => {
        event.preventDefault();
        onSaved("Sample expense removed. No real bill changed.");
        setOpen(false);
      }}
    />
  );
}
