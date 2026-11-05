"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import { DialogPanel } from "./form-dialog";
import { ExpenseReceiptCard } from "./expense-receipt-card";
import { sampleExpenses } from "./expense-preview-data";
import styles from "./expense-receipt-showcase.module.css";

const designs = [
  {
    id: "perforation",
    name: "Fine perforation",
    description: "A finer paper edge, generous spacing and a quiet divider.",
  },
  {
    id: "ticket",
    name: "Ticket stub",
    description: "A perforated footer with small side notches.",
  },
  {
    id: "stack",
    name: "Layered paper",
    description: "Two subtle sheets beneath a clean white receipt.",
  },
  {
    id: "fold",
    name: "Corner fold",
    description: "A crisp folded corner and a more open amount row.",
  },
];

export function ExpenseReceiptShowcase({ activeDesign, onPreview }) {
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const returnFocus = useRef(null);

  function openDetails(expense, event) {
    returnFocus.current = event.currentTarget;
    setDetail(expense);
    setOpen(true);
  }

  return (
    <>
      <div className={styles.toolbar}>
        <p>Open a receipt, or try the whole list in Atelier.</p>
        <DesignButton
          variant="ghost"
          icon="replay"
          aria-pressed={activeDesign === "classic"}
          onClick={() => onPreview("classic")}
        >
          Original receipt
        </DesignButton>
      </div>
      <div className={styles.gallery}>
        {designs.map((design, index) => (
          <figure
            key={design.id}
            className={styles.option}
            data-receipt-option={design.id}
          >
            <figcaption className={styles.caption}>
              <span className={styles.number}>0{index + 1}</span>
              <h3>{design.name}</h3>
              <p>{design.description}</p>
            </figcaption>
            <div className={styles.stage}>
              <ExpenseReceiptCard
                expense={sampleExpenses[0]}
                design={design.id}
                onOpen={openDetails}
              />
            </div>
            <div className={styles.optionFooter}>
              <DesignButton
                variant="secondary"
                icon="arrow"
                iconPosition="end"
                className={styles.previewButton}
                aria-label={`Preview in Atelier: ${design.name}`}
                aria-pressed={activeDesign === design.id}
                onClick={() => onPreview(design.id)}
              >
                Preview in Atelier
              </DesignButton>
              <span>
                {activeDesign === design.id
                  ? "Shown in Atelier"
                  : "Try it with every expense"}
              </span>
            </div>
          </figure>
        ))}
      </div>
      <DialogPanel
        open={open}
        onOpenChange={setOpen}
        title={detail?.name ?? "Expense details"}
        description="The same sample expense, with a different paper treatment."
        closeLabel="Close receipt card details"
        returnFocusRef={returnFocus}
      >
        {detail && (
          <dl className={styles.details}>
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(detail.amount, "USD")}</dd>
            </div>
            <div>
              <dt>Paid by</dt>
              <dd>{detail.payer}</dd>
            </div>
            <div>
              <dt>Your share</dt>
              <dd>{formatMoney(detail.share, "USD")}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{detail.receipt ? "Receipt" : "Manual entry"}</dd>
            </div>
          </dl>
        )}
      </DialogPanel>
    </>
  );
}
