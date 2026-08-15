"use client";

import { useState } from "react";
import { ExpenseForm } from "@/components/expense-form";

export function ExpenseEditor({ bill, expense }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-sm font-semibold text-teal-700 underline-offset-4 hover:underline"
        aria-expanded={open}
      >
        {open ? "Close editor" : "Edit"}
      </button>
      {open ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <ExpenseForm
            bill={bill}
            expense={expense}
            onSaved={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
