"use client";

import { RetainedForm } from "@/components/retained-form";

import { useActionState, useEffect, useRef } from "react";
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
  const imageInput = useRef(null);
  useEffect(() => {
    if (upload.error) imageInput.current?.focus();
  }, [upload.error]);
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
    <details className="rounded-control border-line bg-canvas mt-6 border p-5">
      <summary className="text-foreground cursor-pointer font-semibold">
        Owner ABA QR settings
      </summary>
      <p className="text-muted mt-4 text-sm leading-6">
        Upload an ABA QR that accepts {currency}, including a QR offering both
        KHR and USD. Check the recipient and currency options before saving.
      </p>
      {method ? (
        <p className="text-foreground mt-3 text-sm">
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
        <label className="text-foreground grid gap-2 text-sm font-semibold">
          QR image
          <input
            ref={imageInput}
            name="qrImage"
            aria-invalid={Boolean(upload.error)}
            aria-describedby={upload.error ? "qr-image-error" : undefined}
            type="file"
            accept="image/jpeg,image/png"
            required
            className="rounded-control border-line min-w-0 border bg-white p-3 font-normal"
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
        <p
          id="qr-image-error"
          role="alert"
          className="mt-3 text-sm text-red-700"
        >
          {upload.error}
        </p>
      ) : null}
      {inspecting ? (
        <p role="status" className="text-muted mt-3 text-sm">
          {labels[upload.stage]}
        </p>
      ) : null}
      {draft ? (
        <RetainedForm
          state={saved}
          key={draft.token}
          action={save}
          className="rounded-control border-line mt-5 grid gap-4 border bg-white p-4"
        >
          <p role="status" className="text-brand text-sm">
            QR image inspected. Review the recipient and currencies below.
          </p>
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
          <p className="text-foreground text-sm">
            Decoded recipient: <strong>{draft.recipientLabel}</strong>
            <br />
            Encoded currency: <strong>{draft.currency}</strong>
            <br />
            {draft.fixedAmountMinor !== null
              ? `Fixed amount: ${formatMoney(draft.fixedAmountMinor, draft.currency)}. Only matching transfers can use this QR.`
              : "Amount-free QR: enter the settlement amount in your banking app."}
          </p>
          {draft.fixedAmountMinor === null ? (
            <fieldset className="text-foreground grid gap-3 text-sm">
              <legend className="text-foreground mb-2 font-semibold">
                Currencies this QR accepts
              </legend>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="radio"
                  name="currencyMode"
                  value="single"
                  defaultChecked
                  required
                  className="accent-brand mt-1 size-4"
                />
                {draft.currency} only
              </label>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="radio"
                  name="currencyMode"
                  value="dual"
                  required
                  className="accent-brand mt-1 size-4"
                />
                KHR + USD — I checked that my banking app lets the payer choose
                either currency for this QR.
              </label>
              <p className="text-muted text-xs leading-5">
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
          <label className="flex min-h-11 gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="confirmed"
              value="yes"
              required
              className="accent-brand mt-1 size-4"
            />
            I confirm this is my recipient name and the correct currency.
          </label>
          {saved.errors?.form ? (
            <p role="alert" className="text-sm text-red-700">
              {saved.errors.form}
            </p>
          ) : null}
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
          {removed.errors?.form ? (
            <p role="alert" className="text-sm text-red-700">
              {removed.errors.form}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            disabled={removing || saving}
          >
            {removing ? "Removing…" : "Remove owner QR"}
          </Button>
        </RetainedForm>
      ) : null}
      {saved.success || removed.success ? (
        <p role="status" className="text-brand mt-3 text-sm">
          Owner QR updated.
        </p>
      ) : null}
    </details>
  );
}
