"use client";

import { useRef, useState } from "react";
import { DesignButton } from "./primitives";
import {
  ExpenseDetailDrawer,
  ExpenseDetailSummary,
} from "./expense-detail-drawer";
import { sampleExpenses } from "./expense-preview-data";
import detail from "./expense-detail-drawer.module.css";
import styles from "./expense-drawer-showcase.module.css";

const directions = [
  {
    id: "paper",
    name: "Paper Atelier",
    description:
      "Cool white paper, a generous total and the small details of a keepsake.",
    note: "One receipt-inspired surface through Category, with a pronounced torn edge and softly tinted initials.",
  },
  {
    id: "amethyst",
    name: "Amethyst Suite",
    description: "A rich purple centrepiece. A little more occasion.",
    note: "A sculpted purple summary, fine contour lines and a distinct personal-share panel.",
  },
  {
    id: "gallery",
    name: "Quiet Gallery",
    description: "Confident typography. Fine rules. Space to breathe.",
    note: "An open editorial summary and a finely framed split, with almost no surface tint.",
  },
];

function DrawerDirection({ direction, ready }) {
  const [sample, setSample] = useState("dinner");
  const [expense, setExpense] = useState(sampleExpenses[0]);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState("");
  const trigger = useRef(null);
  const restore = useRef(null);

  function choose(id) {
    setSample(id);
    setExpense(sampleExpenses.find((item) => item.id === id));
    setNotice("");
  }

  return (
    <figure className={styles.option} data-drawer-option={direction.id}>
      <figcaption className={styles.caption}>
        <span className={styles.number}>
          0{directions.findIndex((item) => item.id === direction.id) + 1}
        </span>
        <h3>{direction.name}</h3>
        <p>{direction.description}</p>
      </figcaption>
      <div className={styles.controls}>
        <div role="group" aria-label={`${direction.name} sample`}>
          {[
            ["dinner", "With receipt"],
            ["ride", "Manual"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={sample === id}
              onClick={() => choose(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => choose(sample)}
          aria-label={`Reset ${direction.name} sample`}
        >
          Reset
        </button>
      </div>
      {expense ? (
        <>
          <div
            className={`${styles.specimen} ${detail[direction.id]}`}
            aria-hidden="true"
            inert
          >
            <div className={styles.sampleHeader}>
              <span className={styles.handle} />
              <p>Weekend dinner</p>
              <div>
                <strong>{expense.name}</strong>
                <span>×</span>
              </div>
            </div>
            <ExpenseDetailSummary
              expense={expense}
              compactActions={direction.id === "paper"}
            />
            <div
              className={`${detail.footer} ${direction.id === "paper" ? detail.quietFooter : ""}`}
            >
              {direction.id === "paper" ? (
                <DesignButton
                  variant="secondary"
                  className={detail.removeAction}
                >
                  Remove expense
                </DesignButton>
              ) : (
                <DesignButton variant="secondary">Done</DesignButton>
              )}
              <DesignButton icon="pencil">Edit expense</DesignButton>
            </div>
          </div>
          <DesignButton
            ref={trigger}
            variant="secondary"
            icon="arrow"
            iconPosition="end"
            className={styles.launch}
            disabled={!ready}
            onClick={() => {
              setSession((value) => value + 1);
              setOpen(true);
            }}
          >
            Open {direction.name} drawer
          </DesignButton>
          <ExpenseDetailDrawer
            key={`${sample}-${session}`}
            expense={expense}
            appearance={direction.id}
            open={open}
            onOpenChange={setOpen}
            returnFocusRef={trigger}
            fallbackFocusRef={restore}
            onSave={(updated) => {
              setExpense(updated);
              setNotice("Changes saved to this sample.");
            }}
            onRemove={() => {
              setExpense(null);
              setNotice("Sample expense removed. Reset to try again.");
            }}
          />
        </>
      ) : (
        <div className={styles.removed}>
          <p>Expense removed from this preview.</p>
          <DesignButton
            ref={restore}
            variant="secondary"
            onClick={() => choose(sample)}
          >
            Restore sample
          </DesignButton>
        </div>
      )}
      <p className={styles.note}>{direction.note}</p>
      <p className={styles.status} role="status">
        {notice}
      </p>
    </figure>
  );
}

export function ExpenseDrawerShowcase({ ready }) {
  return (
    <div className={styles.gallery}>
      {directions.map((direction) => (
        <DrawerDirection
          key={direction.id}
          direction={direction}
          ready={ready}
        />
      ))}
    </div>
  );
}
