"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDirectImageUpload } from "@/components/use-direct-image-upload";

export function UploadReceiptForm({ shareToken }) {
  const router = useRouter();
  const upload = useDirectImageUpload({ shareToken, purpose: "receipt" });
  const imageInput = useRef(null);
  const errorOutput = useRef(null);
  const [filename, setFilename] = useState("");
  const id = useId();
  useEffect(() => {
    if (upload.error) errorOutput.current?.focus();
  }, [upload.error]);
  const labels = {
    preparing: "Preparing upload…",
    uploading: "Uploading…",
    processing: "Scanning receipt…",
  };
  async function start() {
    const result = await upload.start();
    if (result?.receiptScanId)
      router.push(`/b/${shareToken}/receipts/${result.receiptScanId}`);
  }
  function chooseImage() {
    // Permit selecting the same image again after a failed attempt.
    imageInput.current.value = "";
    imageInput.current.click();
  }
  return (
    <div className="grid gap-4" aria-busy={upload.pending}>
      <input
        ref={imageInput}
        type="file"
        name="receipt"
        aria-label="Receipt image"
        accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
        disabled={upload.pending}
        className="sr-only"
        tabIndex={-1}
        onChange={async (event) => {
          const selected = event.target.files?.[0];
          if (!selected || !upload.selectFile(event)) return;
          setFilename(selected.name);
          await start();
        }}
      />
      <p id={`${id}-hint`} className="text-muted text-sm">
        JPEG, PNG, or HEIC · up to 10 MB.
      </p>
      {filename && <p className="text-muted text-sm">{filename}</p>}
      {upload.error && (
        <p
          ref={errorOutput}
          tabIndex={-1}
          id={`${id}-error`}
          role="alert"
          className="text-sm text-red-700"
        >
          {upload.error}
        </p>
      )}
      {upload.pending && (
        <p role="status" className="text-muted text-sm">
          {labels[upload.stage]}
        </p>
      )}
      <Button
        icon="upload"
        type="button"
        disabled={upload.pending}
        aria-describedby={`${id}-hint${upload.error ? ` ${id}-error` : ""}`}
        onClick={upload.stage === "failed" ? start : chooseImage}
      >
        {labels[upload.stage] ??
          (upload.stage === "failed" ? "Retry upload" : "Upload receipt")}
      </Button>
      {upload.stage === "failed" && (
        <Button type="button" variant="ghost" onClick={chooseImage}>
          Choose a different image
        </Button>
      )}
    </div>
  );
}
