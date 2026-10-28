"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useId } from "react";
import { useRouter } from "next/navigation";
import { addParticipantAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState = { errors: null };

export function AddParticipantForm({ shareToken, onAdded }) {
  const router = useRouter();
  const id = useId();
  const [state, action, pending] = useActionState(
    async (previous, formData) => {
      const result = await addParticipantAction(previous, formData);
      if (result.success) {
        if (onAdded) onAdded(result.participant);
        else router.refresh();
      }
      return result;
    },
    initialState,
  );

  return (
    <RetainedForm
      state={state}
      action={action}
      className="border-line mt-5 grid gap-4 border-t pt-5"
    >
      <input type="hidden" name="shareToken" value={shareToken} />
      <Field
        id={`${id}-participant-name`}
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
        <p role="status" className="text-brand text-sm">
          Person added.
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add person"}
      </Button>
    </RetainedForm>
  );
}
