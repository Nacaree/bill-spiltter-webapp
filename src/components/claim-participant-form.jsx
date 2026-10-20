"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { claimParticipantAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState = { errors: null };

export function ClaimParticipantForm({ participants, shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    claimParticipantAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <RetainedForm state={state} action={action} className="mt-4 grid gap-4">
      <input type="hidden" name="shareToken" value={shareToken} />
      <label
        className="grid gap-2 text-sm font-semibold text-slate-800"
        htmlFor="claim-participant"
      >
        Choose your name
        <select
          id="claim-participant"
          name="participantId"
          defaultValue=""
          required
          aria-invalid={Boolean(state.errors?.participantId)}
          aria-describedby={
            state.errors?.participantId ? "claim-participant-error" : undefined
          }
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
        >
          <option value="" disabled>
            Select a person
          </option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.display_name}
            </option>
          ))}
        </select>
        {state.errors?.participantId ? (
          <span
            id="claim-participant-error"
            className="font-normal text-red-700"
          >
            {state.errors.participantId}
          </span>
        ) : null}
      </label>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Continue as this person"}
      </Button>
    </RetainedForm>
  );
}
