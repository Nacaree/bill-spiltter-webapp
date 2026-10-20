"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { joinBillAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState = { errors: null };

export function JoinBillForm({ shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(joinBillAction, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <RetainedForm state={state} action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="shareToken" value={shareToken} />
      <Field
        id="join-name"
        name="participantName"
        label="Your name"
        placeholder="Sokha"
        autoComplete="name"
        maxLength={60}
        required
        error={state.errors?.participantName}
      />
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join bill"}
      </Button>
    </RetainedForm>
  );
}
