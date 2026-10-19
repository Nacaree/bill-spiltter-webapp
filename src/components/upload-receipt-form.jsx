"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDirectImageUpload } from "@/components/use-direct-image-upload";

export function UploadReceiptForm({ shareToken }) {
  const router = useRouter();
  const upload = useDirectImageUpload({ shareToken, purpose: "receipt" });
  const labels = {
    preparing: "Preparing upload…",
    uploading: "Uploading…",
    processing: "Processing image…",
  };
  return (
    <form
      onSubmit={async (event) => {
        const result = await upload.submit(event);
        if (result?.receiptScanId)
          router.push(`/b/${shareToken}/receipts/${result.receiptScanId}`);
      }}
      className="grid gap-4"
    >
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Receipt image
        <input
          type="file"
          name="receipt"
          accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
          required
          aria-describedby="receipt-image-hint"
          disabled={upload.pending}
          onChange={upload.selectFile}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-800"
        />
      </label>
      <p id="receipt-image-hint" className="text-sm font-normal text-slate-500">
        JPEG, PNG, or HEIC · up to 10 MB. No camera permission is requested.
      </p>
      {upload.error ? (
        <p role="alert" className="text-sm text-red-700">
          {upload.error}
        </p>
      ) : null}
      {upload.pending ? (
        <p role="status" className="text-sm text-slate-600">
          {labels[upload.stage]}
        </p>
      ) : null}
      <Button type="submit" disabled={upload.pending}>
        {labels[upload.stage] ??
          (upload.stage === "failed" ? "Retry upload" : "Upload receipt")}
      </Button>
    </form>
  );
}
