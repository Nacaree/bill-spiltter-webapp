"use client";

import { RetainedForm } from "@/components/retained-form";

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
      <RetainedForm state={state} action={action}>
        <input type="hidden" name="shareToken" value={shareToken} />
        {Object.entries(transfer).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Opening…" : "Pay with ABA QR"}
        </Button>
        {state.errors?.form ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {state.errors.form}
          </p>
        ) : null}
      </RetainedForm>
      {visible ? (
        <div className="rounded-control border-line mt-4 border bg-white p-4">
          <p role="status" className="text-foreground text-lg font-bold">
            Send {formatMoney(state.qr.amountMinor, state.qr.currency)}
          </p>
          <p className="text-foreground mt-2 text-sm">
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
            className="text-brand mt-3 inline-block font-semibold underline"
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
        <p role="status" className="text-muted mt-3 text-sm">
          QR access expired. Open it again for a fresh image.
        </p>
      ) : null}
    </div>
  );
}
