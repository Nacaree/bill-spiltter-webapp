"use client";

import { useRef } from "react";
import { AlertDialog } from "radix-ui";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import styles from "./expense-removal-dialog.module.css";

export function ExpenseRemovalDialog({
  expense,
  open,
  onOpenChange,
  onConfirm,
  returnFocusRef,
}) {
  const keep = useRef(null);
  const confirmed = useRef(false);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content
          className={styles.dialog}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            confirmed.current = false;
            keep.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!confirmed.current)
              returnFocusRef.current?.focus({ preventScroll: true });
          }}
        >
          <AlertDialog.Title className={styles.title}>
            Remove “{expense.name}”?
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.description}>
            <strong>{formatMoney(expense.amount, "USD")}</strong>
            {" · "}
            This will remove the expense and update everyone’s balance.
          </AlertDialog.Description>
          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <DesignButton ref={keep} variant="secondary">
                Keep expense
              </DesignButton>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <DesignButton
                variant="destructive"
                onClick={() => {
                  confirmed.current = true;
                  onConfirm();
                }}
              >
                Remove expense
              </DesignButton>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
