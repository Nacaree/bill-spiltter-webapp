"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareBillButton() {
  const [message, setMessage] = useState("");
  const [manualLink, setManualLink] = useState("");
  const linkId = useId();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setManualLink("");
      setMessage("Private link copied.");
    } catch {
      setManualLink(window.location.href);
      setMessage("Copy the private link from the field below.");
    }
  }

  return (
    <div className="grid min-w-0 gap-2 sm:max-w-xs">
      <Button icon="copy" type="button" variant="secondary" onClick={copyLink}>
        Copy private link
      </Button>
      <p role="status" className="text-muted text-sm">
        {message}
      </p>
      {manualLink ? (
        <label
          htmlFor={linkId}
          className="text-foreground grid gap-2 text-sm font-semibold"
        >
          Private bill link
          <input
            id={linkId}
            ref={(node) => {
              node?.focus();
              node?.select();
            }}
            type="text"
            readOnly
            value={manualLink}
            onFocus={(event) => event.target.select()}
            className="rounded-control border-line min-h-12 border bg-white px-3 font-normal"
          />
        </label>
      ) : null}
    </div>
  );
}
