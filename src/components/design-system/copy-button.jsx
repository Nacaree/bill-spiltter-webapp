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
  iconOnly = false,
  "aria-label": ariaLabel,
  title,
}) {
  const [state, setState] = useState("idle");
  const resetTimer = useRef(null);
  const mounted = useRef(false);
  const copying = useRef(false);
  const compactLabel =
    ariaLabel ?? (typeof children === "string" ? children : "Copy link");

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
      data-icon-only={iconOnly || undefined}
      disabled={disabled}
      aria-label={
        iconOnly ? compactLabel : state === "copied" ? undefined : ariaLabel
      }
      title={
        title ??
        (iconOnly
          ? state === "copied"
            ? copiedLabel
            : compactLabel
          : undefined)
      }
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
            <span className={styles.copyLabelText}>
              <span>{children}</span>
            </span>
          </span>
          <span
            className={styles.copySuccessLabel}
            aria-hidden={state !== "copied"}
          >
            {state === "copied" ? icon : iconPlaceholder}
            <span className={styles.copyLabelText}>
              <span>{copiedLabel}</span>
            </span>
          </span>
        </span>
      )}
    </DesignButton>
  );
}
