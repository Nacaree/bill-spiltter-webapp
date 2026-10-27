"use client";

import { useActionState } from "react";
import { deleteBillAction } from "@/app/lifecycle-actions";
import { RetainedForm } from "@/components/retained-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function DeleteBillForm({ shareToken }) {
  const [state, action, pending] = useActionState(deleteBillAction, {});
  return (
    <section
      className="rounded-card mt-10 border border-red-200 bg-white p-6 sm:p-8"
      aria-labelledby="delete-bill-heading"
    >
      <h2 id="delete-bill-heading" className="text-xl font-bold text-red-900">
        Delete bill permanently
      </h2>
      <p
        id="delete-bill-warning"
        className="text-foreground mt-3 text-sm leading-6"
      >
        This removes the bill for everyone, including expenses, payment records,
        receipts and the owner’s QR. There is no undo. Image removal may take
        longer if storage is temporarily unavailable.
      </p>
      <RetainedForm
        state={state}
        action={action}
        className="mt-5 grid max-w-md gap-4"
        aria-describedby="delete-bill-warning"
        aria-busy={pending}
      >
        <input type="hidden" name="shareToken" value={shareToken} />
        <Field
          id="delete-bill-confirmation"
          label="Type DELETE to confirm"
          name="confirmation"
          autoComplete="off"
          required
          error={state.errors?.confirmation}
        />
        <Button type="submit" disabled={pending} variant="destructive">
          {pending ? "Deleting bill…" : "Delete bill permanently"}
        </Button>
        {state.errors?.form ? (
          <p role="alert" className="text-sm text-red-700">
            {state.errors.form}
          </p>
        ) : null}
      </RetainedForm>
    </section>
  );
}
