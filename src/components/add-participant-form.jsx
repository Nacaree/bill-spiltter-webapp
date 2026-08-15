"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addParticipantAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState = { errors: null };

export function AddParticipantForm({ shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    addParticipantAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form
      action={action}
      className="mt-5 grid gap-4 border-t border-slate-100 pt-5"
    >
      <input type="hidden" name="shareToken" value={shareToken} />
      <Field
        id="add-participant-name"
        name="participantName"
        label="Add someone"
        placeholder="Dara"
        autoComplete="off"
        maxLength={60}
        required
        error={state.errors?.participantName}
        hint="They can claim this name when they open the private link."
      />
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-teal-700">
          Person added.
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add person"}
      </Button>
    </form>
  );
}
