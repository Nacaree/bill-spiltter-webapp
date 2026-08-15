"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareBillButton() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="secondary" onClick={copyLink}>
      {copied ? "Link copied" : "Copy private link"}
    </Button>
  );
}
