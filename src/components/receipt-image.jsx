/* eslint-disable @next/next/no-img-element -- Private expiring images must not pass through an image optimizer. */
"use client";

import { useState } from "react";

export function ReceiptImage({ src }) {
  const [failedSource, setFailedSource] = useState(null);
  if (!src || failedSource === src)
    return (
      <p role="status" className="text-muted p-4 text-sm">
        Receipt image unavailable.
      </p>
    );
  // A missing historical file must not hide the confirmed financial record.
  return (
    <img
      src={src}
      onError={() => setFailedSource(src)}
      alt="Uploaded receipt"
      className="rounded-control max-h-[70vh] w-full object-contain"
    />
  );
}
