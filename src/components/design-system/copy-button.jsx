"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { DesignButton } from "./design-button";
import styles from "./system.module.css";

// onCopy resolves false on failure; success feedback follows the clipboard write.
export function DesignCopyButton({
  onCopy,
  children = "Copy link",
  copiedLabel = "Copied",
  className,
  disabled,
  variant = "secondary",
}) {
  const [state, setState] = useState("idle");
  const resetTimer = useRef(null);
  const mounted = useRef(false);
  const copying = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    if (copying.current) return;
    copying.current = true;
    clearTimeout(resetTimer.current);
    setState("copying");
    try {
      const result = await onCopy();
      if (!mounted.current) return;
      setState(result === false ? "idle" : "copied");
      if (result !== false) {
        resetTimer.current = setTimeout(() => setState("idle"), 1800);
      }
    } catch {
      if (mounted.current) setState("idle");
    } finally {
      copying.current = false;
    }
  }

  const iconPlaceholder = (
    <span
      className={styles.buttonIcon}
      data-icon-placeholder
      aria-hidden="true"
    />
  );

  return (
    <DesignButton
      type="button"
      variant={variant}
      className={cn(styles.copyButton, className)}
      data-copy-state={state}
      disabled={disabled}
      aria-busy={state === "copying" || undefined}
      icon={state === "copied" ? "check" : "copy"}
      iconAnimate={state === "copied"}
      onClick={copy}
    >
      {(icon) => (
        <span
          className={styles.copyLabels}
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className={styles.copyIdleLabel}
            aria-hidden={state === "copied"}
          >
            {state !== "copied" ? icon : iconPlaceholder}
            <span>{children}</span>
          </span>
          <span
            className={styles.copySuccessLabel}
            aria-hidden={state !== "copied"}
          >
            {state === "copied" ? icon : iconPlaceholder}
            <span>{copiedLabel}</span>
          </span>
        </span>
      )}
    </DesignButton>
  );
}
