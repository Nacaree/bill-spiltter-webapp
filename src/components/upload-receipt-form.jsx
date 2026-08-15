"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadReceiptAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState = { errors: null };

export function UploadReceiptForm({ shareToken }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    uploadReceiptAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/b/${state.shareToken}/receipts/${state.receiptScanId}`);
    }
  }, [router, state]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="shareToken" value={shareToken} />
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Receipt image
        <input
          type="file"
          name="receipt"
          accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
          required
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-800"
        />
        <span className="font-normal text-slate-500">
          JPEG, PNG, or HEIC · up to 10 MB. No camera permission is requested.
        </span>
        {state.errors?.file ? (
          <span role="alert" className="font-normal text-red-700">
            {state.errors.file}
          </span>
        ) : null}
      </label>
      {state.errors?.form ? (
        <p role="alert" className="text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload receipt"}
      </Button>
    </form>
  );
}
