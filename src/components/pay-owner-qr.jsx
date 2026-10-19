"use client";

import { useActionState, useEffect, useState } from "react";
import { openOwnerQrAction } from "@/app/settlement-actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export function PayOwnerQr({ shareToken, transfer }) {
  const [state, action, pending] = useActionState(openOwnerQrAction, {});
  const [expired, setExpired] = useState(null);
  useEffect(() => {
    if (!state.qr) return;
    const timeout = setTimeout(
      () => setExpired(state.qr.expiresAt),
      Math.max(0, state.qr.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [state]);
  const visible = state.qr && expired !== state.qr.expiresAt;
  return (
    <div className="mt-4">
      <form action={action}>
        <input type="hidden" name="shareToken" value={shareToken} />
        {Object.entries(transfer).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Opening…" : "Pay with ABA QR"}
        </Button>
      </form>
      {state.errors?.form ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.errors.form}
        </p>
      ) : null}
      {visible ? (
        <div className="mt-4 rounded-xl border border-teal-200 bg-white p-4">
          <p className="text-lg font-bold text-slate-950">
            Send {formatMoney(state.qr.amountMinor, state.qr.currency)}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Bank recipient: <strong>{state.qr.recipientLabel}</strong> ·{" "}
            {state.qr.currency}
          </p>
          {/* Short-lived private storage URL; no optimizer cache. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.qr.imageUrl}
            alt={`Payment QR for ${state.qr.recipientLabel}`}
            width={280}
            height={280}
            className="mx-auto mt-3 h-auto max-w-full"
          />
          <a
            href={state.qr.downloadUrl}
            className="mt-3 inline-block font-semibold text-teal-700 underline"
          >
            Download QR image
          </a>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            If your banking app offers KHR and USD, choose {state.qr.currency}{" "}
            for this bill. Verify the recipient, currency and exact amount in
            your banking app before sending. Opening this QR does not record a
            payment. After transferring, use Record payment below.
          </p>
        </div>
      ) : state.qr ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          QR access expired. Open it again for a fresh image.
        </p>
      ) : null}
    </div>
  );
}
