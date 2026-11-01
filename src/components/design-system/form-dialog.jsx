"use client";

import { Dialog } from "radix-ui";
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
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.panel} ${className}`}
          data-kind={kind}
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
            <span className={styles.handle} aria-hidden="true" />
          )}
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description>{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <DesignButton
                icon="close"
                variant="ghost"
                className={styles.close}
                aria-label={closeLabel}
              />
            </Dialog.Close>
          </div>
          {children}
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
