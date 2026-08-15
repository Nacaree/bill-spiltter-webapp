"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState = { errors: null };

export function RemoveExpenseForm({ expenseId, shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    removeExpenseAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Remove this expense from the bill?")) {
          event.preventDefault();
        }
      }}
      className="grid gap-2"
    >
      <input type="hidden" name="shareToken" value={shareToken} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Removing…" : "Remove expense"}
      </Button>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
    </form>
  );
}
