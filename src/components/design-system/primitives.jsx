import { cn } from "@/lib/cn";
import styles from "./system.module.css";

export function DesignButton({
  variant = "primary",
  className,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant === "destructive" ? "dangerButton" : variant],
        className,
      )}
      {...props}
    />
  );
}

export function DesignSurface({ glass = false, className, ...props }) {
  return (
    <div
      className={cn(styles.surface, glass && styles.glass, className)}
      {...props}
    />
  );
}

export function DesignBadge({ tone = "neutral", children }) {
  return (
    <span className={cn(styles.badge, styles[tone])}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}

export function DesignCheckbox({ children, indicator, ...props }) {
  return (
    <label className={styles.choice}>
      <input type="checkbox" className={styles.checkboxInput} {...props} />
      <span className={styles.checkMarker} aria-hidden="true">
        {indicator ?? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path pathLength="1" d="m5 12 4 4L19 6" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function DesignField({
  id,
  label,
  hint,
  error,
  className,
  inputClassName,
  ...props
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={cn(styles.input, inputClassName)}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hintId, errorId].filter(Boolean).join(" ") || undefined
        }
        {...props}
      />
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}

export function DesignAlert({ tone = "info", children }) {
  return (
    <div className={cn(styles.alert, styles[tone])}>
      <span className={styles.alertMark} aria-hidden="true">
        {tone === "success" ? "✓" : tone === "danger" ? "!" : "i"}
      </span>
      <div>{children}</div>
    </div>
  );
}
