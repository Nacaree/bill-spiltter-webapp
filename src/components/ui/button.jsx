"use client";

import { DesignButton } from "@/components/design-system/primitives";

// Keep the native submit default; icon behavior is shared with the design system.
export function Button({ type, ...props }) {
  return <DesignButton type={type ?? "submit"} {...props} />;
}
