"use client";

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
        className="grid gap-2 text-sm font-semibold text-slate-800"
        htmlFor="currency"
      >
        Currency
        <select
          id="currency"
          name="currency"
          defaultValue="USD"
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
        >
          {BILL_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
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
