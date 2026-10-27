"use client";

import { SelectControl } from "@/components/ui/select";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBillAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { BILL_CURRENCIES } from "@/lib/bill-input";

const initialState = { errors: null };

export function CreateBillForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createBillAction,
    initialState,
  );

  useEffect(() => {
    if (!state.success) return;
    router.push(`/b/${state.shareToken}`);
  }, [router, state]);

  return (
    <RetainedForm state={state} action={action} className="mt-7 grid gap-5">
      <Field
        id="bill-name"
        name="billName"
        label="Bill name"
        placeholder="Beach weekend"
        autoComplete="off"
        maxLength={100}
        required
        error={state.errors?.billName}
      />
      <Field
        id="your-name"
        name="participantName"
        label="Your name"
        placeholder="Sokha"
        autoComplete="name"
        maxLength={60}
        required
        error={state.errors?.participantName}
      />
      <label
        className="text-foreground grid gap-2 text-sm font-semibold"
        htmlFor="currency"
      >
        Currency
        <SelectControl
          aria-label="Currency"
          id="currency"
          name="currency"
          aria-invalid={Boolean(state.errors?.currency)}
          aria-describedby={
            state.errors?.currency ? "currency-error" : undefined
          }
          defaultValue="USD"
        >
          {BILL_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </SelectControl>
        {state.errors?.currency ? (
          <span id="currency-error" className="font-normal text-red-700">
            {state.errors.currency}
          </span>
        ) : null}
      </label>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      <Button className="mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create bill"}
      </Button>
    </RetainedForm>
  );
}
