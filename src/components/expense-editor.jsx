"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ExpenseForm } from "@/components/expense-form";

export function ExpenseEditor({ bill, expense }) {
  const editorId = useId();
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);

  if (expense.receipt_scan_id)
    return (
      <Link
        href={`/b/${bill.shareToken}/receipts/${expense.receipt_scan_id}?edit=1`}
        aria-describedby={`expense-${expense.id}-heading`}
        className="text-brand inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
      >
        Edit receipt
      </Link>
    );

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-brand min-h-11 min-w-11 text-sm font-semibold underline-offset-4 hover:underline"
        aria-describedby={`expense-${expense.id}-heading`}
        aria-expanded={open}
        aria-controls={open ? editorId : undefined}
      >
        {open ? "Close editor" : "Edit"}
      </button>
      {open ? (
        <div
          id={editorId}
          className="reveal-content border-line mt-5 border-t pt-5"
        >
          <ExpenseForm
            bill={bill}
            expense={expense}
            onSaved={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
