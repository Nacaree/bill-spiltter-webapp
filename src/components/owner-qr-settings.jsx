"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  removeOwnerQrAction,
  saveOwnerQrAction,
} from "@/app/settlement-actions";
import { Button } from "@/components/ui/button";
import { useDirectImageUpload } from "@/components/use-direct-image-upload";
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
  const upload = useDirectImageUpload({ shareToken, purpose: "owner_qr" });
  const inspecting = upload.pending;
  const labels = {
    preparing: "Preparing upload…",
    uploading: "Uploading…",
    processing: "Reading QR…",
  };
  const [saved, save, saving] = useActionState(saveOwnerQrAction, {});
  const [removed, remove, removing] = useActionState(removeOwnerQrAction, {});
  useEffect(() => {
    if (saved.success || removed.success) router.refresh();
  }, [router, saved, removed]);
  const draft = upload.result?.preview;
  return (
    <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer font-semibold text-slate-900">
        Owner ABA QR settings
      </summary>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Upload an ABA QR that accepts {currency}, including a QR offering both
        KHR and USD. Check the recipient and currency options before saving.
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
      <form className="mt-4 grid gap-4" onSubmit={upload.submit}>
        <input type="hidden" name="shareToken" value={shareToken} />
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          QR image
          <input
            name="qrImage"
            type="file"
            accept="image/jpeg,image/png"
            required
            className="min-w-0 rounded-xl border border-slate-300 bg-white p-3 font-normal"
            disabled={inspecting || saving}
            onChange={upload.selectFile}
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={inspecting || saving}
        >
          {labels[upload.stage] ??
            (upload.stage === "failed"
              ? "Retry QR inspection"
              : "Inspect QR image")}
        </Button>
      </form>
      {upload.error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {upload.error}
        </p>
      ) : null}
      {inspecting ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {labels[upload.stage]}
        </p>
      ) : null}
      {draft ? (
        <RetainedForm
          state={saved}
          key={draft.token}
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
            Encoded currency: <strong>{draft.currency}</strong>
            <br />
            {draft.fixedAmountMinor !== null
              ? `Fixed amount: ${formatMoney(draft.fixedAmountMinor, draft.currency)}. Only matching transfers can use this QR.`
              : "Amount-free QR: enter the settlement amount in your banking app."}
          </p>
          {draft.fixedAmountMinor === null ? (
            <fieldset className="grid gap-3 text-sm text-slate-700">
              <legend className="mb-2 font-semibold text-slate-900">
                Currencies this QR accepts
              </legend>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="currencyMode"
                  value="single"
                  defaultChecked
                  required
                  className="mt-1 size-4 accent-teal-700"
                />
                {draft.currency} only
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="currencyMode"
                  value="dual"
                  required
                  className="mt-1 size-4 accent-teal-700"
                />
                KHR + USD — I checked that my banking app lets the payer choose
                either currency for this QR.
              </label>
              <p className="text-xs leading-5 text-slate-600">
                The encoded currency may be the default. Select both only after
                checking the currency choices in your banking app.
              </p>
            </fieldset>
          ) : (
            <input type="hidden" name="currencyMode" value="single" />
          )}
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
        </RetainedForm>
      ) : null}
      {method ? (
        <RetainedForm
          state={removed}
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
        </RetainedForm>
      ) : null}
      {[saved, removed].map((state, index) =>
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
