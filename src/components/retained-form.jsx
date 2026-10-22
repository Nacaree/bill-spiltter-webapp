"use client";

import { useEffect, useRef } from "react";

// React resets uncontrolled fields after a fulfilled form action, including
// expected errors returned as state. Keep rejected entries available to correct.
export function RetainedForm({ state, children, onSubmit, ...props }) {
  const form = useRef(null);
  const submitted = useRef(null);
  useEffect(() => {
    const rejected =
      Object.values(state?.errors ?? {}).some(Boolean) ||
      ["rate_limited", "rate_limit_unavailable"].includes(state?.code);
    if (!rejected || !submitted.current) return;
    const restore = () => {
      for (const element of form.current?.elements ?? []) {
        if (
          !element.name ||
          element.type === "file" ||
          ["submit", "button"].includes(element.type)
        )
          continue;
        const values = submitted.current.getAll(element.name).map(String);
        if (["checkbox", "radio"].includes(element.type))
          element.checked = values.includes(element.value);
        else if (element.multiple && element.options) {
          for (const option of element.options)
            option.selected = values.includes(option.value);
        } else element.value = values[0] ?? "";
      }
      // Move to the first invalid field, or the form error if there is no
      // field-level error. Only do this in response to a submitted action.
      const target = form.current?.querySelector(
        '[aria-invalid="true"], [role="alert"]',
      );
      if (target) {
        if (!target.matches("input, select, textarea, button, [tabindex]"))
          target.setAttribute("tabindex", "-1");
        target.focus();
      }
    };
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [state]);
  return (
    <form
      {...props}
      ref={form}
      onSubmit={(event) => {
        submitted.current = new FormData(event.currentTarget);
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
