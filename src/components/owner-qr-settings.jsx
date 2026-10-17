"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  previewOwnerQrAction,
  removeOwnerQrAction,
  saveOwnerQrAction,
} from "@/app/settlement-actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

function MethodIdentity({ method, shareToken }) {
  return (
    <>
      <input type="hidden" name="shareToken" value={shareToken} />
      <input type="hidden" name="expectedMethodId" value={method?.id ?? ""} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={method?.updated_at ?? ""}
      />
    </>
  );
}

export function OwnerQrSettings({ method, shareToken, currency }) {
  const router = useRouter();
  const [preview, inspect, inspecting] = useActionState(
    previewOwnerQrAction,
    {},
  );
  const [saved, save, saving] = useActionState(saveOwnerQrAction, {});
  const [removed, remove, removing] = useActionState(removeOwnerQrAction, {});
  const [showPreview, setShowPreview] = useState(true);
  useEffect(() => {
    if (saved.success || removed.success) router.refresh();
  }, [router, saved, removed]);
  const draft = showPreview ? preview.preview : null;
  return (
    <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer font-semibold text-slate-900">
        Owner ABA QR settings
      </summary>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Upload one ABA KHQR in {currency}. An amount-free QR can be reused.
        Check the decoded recipient before saving.
      </p>
      {method ? (
        <p className="mt-3 text-sm text-slate-700">
          Current recipient: <strong>{method.recipient_label}</strong> ·{" "}
          {method.supported_currencies.join(", ")}
          {method.fixed_amount_minor !== null
            ? ` · Fixed amount ${formatMoney(method.fixed_amount_minor, currency)}`
            : " · No fixed amount"}
          {method.expires_at
            ? ` · Expires ${new Date(method.expires_at).toLocaleString()}`
            : ""}
        </p>
      ) : null}
      <form
        action={inspect}
        className="mt-4 grid gap-4"
        onSubmit={() => setShowPreview(true)}
      >
        <input type="hidden" name="shareToken" value={shareToken} />
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          QR image
          <input
            name="qrImage"
            type="file"
            accept="image/jpeg,image/png"
            required
            className="min-w-0 rounded-xl border border-slate-300 bg-white p-3 font-normal"
            onChange={() => setShowPreview(false)}
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={inspecting || saving}
        >
          {inspecting ? "Reading QR…" : "Inspect QR image"}
        </Button>
      </form>
      {draft ? (
        <form
          action={save}
          className="mt-5 grid gap-4 rounded-xl border border-teal-200 bg-white p-4"
        >
          <MethodIdentity method={method} shareToken={shareToken} />
          <input type="hidden" name="previewToken" value={draft.token} />
          <input type="hidden" name="previewImage" value={draft.image} />
          {/* The server validates and crops this uploaded bitmap. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.image}
            alt="Uploaded payment QR preview"
            width={260}
            height={260}
            className="mx-auto h-auto max-w-full"
          />
          <p className="text-sm text-slate-700">
            Decoded recipient: <strong>{draft.recipientLabel}</strong>
            <br />
            Currency: <strong>{draft.currency}</strong>
            <br />
            {draft.fixedAmountMinor !== null
              ? `Fixed amount: ${formatMoney(draft.fixedAmountMinor, draft.currency)}. Only matching transfers can use this QR.`
              : "Amount-free QR: enter the settlement amount in your banking app."}
          </p>
          {draft.expiresAt ? (
            <p className="text-sm text-amber-800">
              Expires: {new Date(draft.expiresAt).toLocaleString()}
            </p>
          ) : null}
          <label className="flex gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="confirmed"
              value="yes"
              required
              className="mt-1 size-4 accent-teal-700"
            />
            I confirm this is my recipient name and the correct currency.
          </label>
          <Button type="submit" disabled={saving || inspecting}>
            {saving ? "Saving…" : method ? "Replace owner QR" : "Save owner QR"}
          </Button>
        </form>
      ) : null}
      {method ? (
        <form
          action={remove}
          className="mt-4"
          onSubmit={(event) => {
            if (
              !window.confirm("Remove the owner’s payment QR from this bill?")
            )
              event.preventDefault();
          }}
        >
          <MethodIdentity method={method} shareToken={shareToken} />
          <Button
            type="submit"
            variant="secondary"
            disabled={removing || saving}
          >
            {removing ? "Removing…" : "Remove owner QR"}
          </Button>
        </form>
      ) : null}
      {[preview, saved, removed].map((state, index) =>
        state.errors?.form ? (
          <p key={index} role="alert" className="mt-3 text-sm text-red-700">
            {state.errors.form}
          </p>
        ) : null,
      )}
      {saved.success || removed.success ? (
        <p role="status" className="mt-3 text-sm text-teal-800">
          Owner QR updated.
        </p>
      ) : null}
    </details>
  );
}
