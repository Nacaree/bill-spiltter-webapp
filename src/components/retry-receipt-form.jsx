"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { retryReceiptAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState = { errors: null };

export function RetryReceiptForm({ receiptScanId, shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    retryReceiptAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);

  return (
    <RetainedForm state={state} action={action} className="grid gap-3">
      <input type="hidden" name="shareToken" value={shareToken} />
      <input type="hidden" name="receiptScanId" value={receiptScanId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Retrying…" : "Retry extraction"}
      </Button>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
    </RetainedForm>
  );
}
