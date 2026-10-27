"use client";

import { useState } from "react";
import { DesignButton } from "@/components/design-system/primitives";
import { useDesignReducedMotion } from "@/components/design-system/use-design-reduced-motion";
import { Check } from "@/components/design-system/icons/animate-ui/check";
import { Copy } from "@/components/design-system/icons/animate-ui/copy";
import { Upload } from "@/components/design-system/icons/animate-ui/upload";
const icons = { check: Check, copy: Copy, upload: Upload };

// Preserve the existing native submit default for callers inside forms.
export function Button({
  type,
  icon,
  children,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useDesignReducedMotion();
  const Icon = icons[icon];
  return (
    <DesignButton
      type={type ?? "submit"}
      {...props}
      onPointerEnter={(event) => {
        setHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    >
      {Icon && (
        <span aria-hidden="true">
          <Icon
            size={18}
            animate={
              reducedMotion === false && !props.disabled && (hovered || focused)
            }
          />
        </span>
      )}
      {children}
    </DesignButton>
  );
}
