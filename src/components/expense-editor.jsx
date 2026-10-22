"use client";

import { useId, useRef, useState } from "react";
import { ExpenseForm } from "@/components/expense-form";

export function ExpenseEditor({ bill, expense }) {
  const editorId = useId();
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="min-h-11 min-w-11 text-sm font-semibold text-teal-700 underline-offset-4 hover:underline"
        aria-describedby={`expense-${expense.id}-heading`}
        aria-expanded={open}
        aria-controls={open ? editorId : undefined}
      >
        {open ? "Close editor" : "Edit"}
      </button>
      {open ? (
        <div id={editorId} className="mt-5 border-t border-slate-200 pt-5">
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
