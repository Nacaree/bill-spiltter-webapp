"use client";

import { Dialog } from "radix-ui";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { DesignButton } from "./primitives";
import styles from "./form-dialog.module.css";

export function DialogPanel({
  open,
  onOpenChange,
  kind = "expense",
  title,
  description,
  eyebrow = "Weekend dinner",
  trigger,
  children,
  initialFocusRef,
  returnFocusRef,
  fallbackFocusRef,
  closeLabel = "Close form",
  onCloseAutoFocus,
  className = "",
  viewportAware = false,
  layoutKey,
}) {
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const attachPanel = useCallback((node) => {
    panelRef.current = node;
    setMounted(Boolean(node));
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!viewportAware || !open || !panel) return;
    const viewport = window.visualViewport;
    const header = panel.querySelector("[data-panel-header]");
    const footer = panel.querySelector("[data-panel-footer]");
    const handle = panel.querySelector("[data-panel-handle]");
    const scroll = panel.querySelector("[data-panel-scroll]");
    let frame;

    function revealFocus() {
      if (panel.dataset.overflowLayout !== "flow") return;
      const focused = document.activeElement;
      if (!scroll.contains(focused)) return;
      const error = focused.closest("form")?.querySelector('[role="alert"]');
      const bounds = scroll.getBoundingClientRect();
      const target = focused.getBoundingClientRect();
      const bottom = Math.max(
        target.bottom,
        error?.getBoundingClientRect().bottom ?? 0,
      );
      if (bottom > bounds.bottom - 8)
        scroll.scrollTop += bottom - bounds.bottom + 8;
      // The field takes priority when both it and a long error cannot fit.
      const top = focused.getBoundingClientRect().top;
      if (top < bounds.top + 8) scroll.scrollTop -= bounds.top + 8 - top;
    }

    function update() {
      frame = undefined;
      const height = viewport?.height ?? window.innerHeight;
      if (viewport) {
        panel.style.setProperty("--dialog-viewport-height", `${height}px`);
        panel.style.setProperty(
          "--dialog-viewport-top",
          `${viewport.offsetTop}px`,
        );
        panel.style.setProperty(
          "--dialog-viewport-bottom",
          `${Math.max(0, window.innerHeight - viewport.offsetTop - height)}px`,
        );
      }
      panel.dataset.compact = String(height <= 480);
      const gap = window.matchMedia("(max-width: 639px)").matches ? 12 : 32;
      const fixedHeight =
        header.offsetHeight +
        (footer?.offsetHeight ?? 0) +
        (handle ? handle.offsetHeight + 10 : 0);
      // A clipped sliver of a name is not a useful list. Reserve space for its
      // count and one row before keeping the footer pinned.
      const minimumBodyHeight = panel.querySelector("[data-panel-list]")
        ? 100
        : 40;
      panel.dataset.overflowLayout =
        height - gap < fixedHeight + minimumBodyHeight ? "flow" : "pinned";
      revealFocus();
    }

    function schedule() {
      if (frame === undefined) frame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    if (footer) observer.observe(footer);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    scroll.addEventListener("focusin", schedule);
    update();
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      scroll.removeEventListener("focusin", schedule);
      cancelAnimationFrame(frame);
    };
  }, [open, mounted, viewportAware, layoutKey]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          ref={viewportAware ? attachPanel : undefined}
          className={`${styles.panel} ${className}`}
          data-kind={kind}
          data-viewport-aware={viewportAware || undefined}
          {...(!description && { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={(event) => {
            if (onCloseAutoFocus) {
              onCloseAutoFocus(event);
              return;
            }
            if (returnFocusRef || fallbackFocusRef) {
              event.preventDefault();
              const target = returnFocusRef?.current?.isConnected
                ? returnFocusRef.current
                : fallbackFocusRef?.current;
              target?.focus({ preventScroll: true });
            }
          }}
        >
          {kind !== "confirm" && (
            <span
              className={styles.handle}
              data-panel-handle
              aria-hidden="true"
            />
          )}
          <div className={styles.header} data-panel-header>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <div className={styles.titleRow}>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <DesignButton
                  icon="close"
                  variant="ghost"
                  className={styles.close}
                  aria-label={closeLabel}
                />
              </Dialog.Close>
            </div>
            {description && (
              <Dialog.Description className={styles.description}>
                {description}
              </Dialog.Description>
            )}
          </div>
          {viewportAware ? (
            <div className={styles.viewportContents} data-panel-scroll>
              {children}
            </div>
          ) : (
            children
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FormDialog({
  kind = "expense",
  children,
  onSubmit,
  submitLabel,
  submitIcon = "plus",
  footerNote = "Your entries stay here if you close.",
  cancelLabel,
  ...props
}) {
  return (
    <DialogPanel {...props} kind={kind}>
      <form noValidate onSubmit={onSubmit} className={styles.form}>
        {children && <div className={styles.body}>{children}</div>}
        <div className={styles.footer}>
          {footerNote && <p>{footerNote}</p>}
          <div className={styles.actions}>
            {cancelLabel && (
              <Dialog.Close asChild>
                <DesignButton variant="secondary">{cancelLabel}</DesignButton>
              </Dialog.Close>
            )}
            <DesignButton
              type="submit"
              variant={kind === "confirm" ? "destructive" : "primary"}
              icon={submitIcon}
            >
              {submitLabel}
            </DesignButton>
          </div>
        </div>
      </form>
    </DialogPanel>
  );
}
