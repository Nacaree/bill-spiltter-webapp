"use client";

import { formatMoney } from "@/lib/money";
import { Coffee } from "./icons/animate-ui/coffee";
import { Route } from "./icons/animate-ui/route";
import styles from "./expense-receipt-card.module.css";

export function ExpenseReceiptCard({ expense, design, onOpen }) {
  const Icon = expense.category === "Transport" ? Route : Coffee;
  return (
    <div className={styles.card} data-receipt-design={design}>
      <button
        type="button"
        className={styles.button}
        onClick={(event) => onOpen(expense, event)}
      >
        <span className={styles.icon} aria-hidden="true">
          <Icon size={24} animate={false} />
        </span>
        <span className={styles.copy}>
          <strong>{expense.name}</strong>
          <span>Paid by {expense.payer}</span>
        </span>
        <span className={styles.amount}>
          <strong>{formatMoney(expense.amount, "USD")}</strong>
          <span className={styles.share}>
            <span>Your share</span>
            <strong>{formatMoney(expense.share, "USD")}</strong>
          </span>
        </span>
        <span className={styles.footer}>
          <span>{expense.date.replace("OCT", "Oct")} 2026</span>
          <span className={styles.source}>
            {expense.receipt ? "Receipt attached" : "Added manually"}
          </span>
        </span>
      </button>
    </div>
  );
}
