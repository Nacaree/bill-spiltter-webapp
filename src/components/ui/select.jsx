"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import * as Select from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import system from "@/components/design-system/system.module.css";
import styles from "@/components/design-system/person-picker.module.css";

// The native bridge preserves real FormData values (including the empty filter
// option), browser validation, form resets and RetainedForm restoration.
const emptyOption = "__bill_splitter_empty_option__";
function optionText(children) {
  return Children.toArray(children)
    .map((child) =>
      isValidElement(child) ? optionText(child.props.children) : String(child),
    )
    .join("");
}
function flattenOptions(children) {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type !== "option") return flattenOptions(child.props.children);
    return [
      {
        value: String(child.props.value ?? child.props.children),
        label: optionText(child.props.children),
        disabled: child.props.disabled,
      },
    ];
  });
}
function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function Avatar({ option }) {
  const initials =
    option.initials ??
    String(option.label)
      .replace(/\s+\(inactive\)$/, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  return (
    <span
      className={cn(styles.avatar, styles[option.tone ?? "purple"])}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function SelectControl({
  children,
  options: suppliedOptions,
  person = false,
  name,
  id: suppliedId,
  value,
  defaultValue = "",
  onChange,
  onValueChange,
  required,
  disabled,
  className,
  themeStyle,
  placeholder,
  ...props
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const options = suppliedOptions ?? flattenOptions(children);
  const [localValue, setLocalValue] = useState(String(value ?? defaultValue));
  const current = String(value ?? localValue);
  const [invalid, setInvalid] = useState(false);
  const native = useRef(null);
  const trigger = useRef(null);
  const initialValue = useRef(String(value ?? defaultValue));
  const selected = options.find((option) => option.value === current);
  const empty = options.find((option) => option.value === "");
  const isPlaceholder = !current && (!empty || empty.disabled);

  function change(next) {
    setLocalValue(next);
    setInvalid(false);
    onValueChange?.(next);
    onChange?.({
      target: { name, value: next },
      currentTarget: { name, value: next },
    });
  }
  // Reset the visible state as well as the native bridge after successful actions.
  useEffect(() => {
    const form = native.current?.form;
    function reset() {
      change(initialValue.current);
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
    // Keep current callbacks when a controlled field's surrounding form changes.
  });
  const invalidField =
    invalid ||
    props["aria-invalid"] === true ||
    props["aria-invalid"] === "true";
  return (
    <>
      <Select.Root
        value={isPlaceholder ? "" : current || emptyOption}
        disabled={disabled}
        onValueChange={(next) => change(next === emptyOption ? "" : next)}
      >
        <Select.Trigger
          {...props}
          ref={trigger}
          id={id}
          aria-required={required || undefined}
          aria-invalid={invalidField || undefined}
          aria-describedby={
            [props["aria-describedby"], invalid && `${id}-required`]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(styles.trigger, className)}
        >
          <Select.Value
            placeholder={placeholder ?? empty?.label ?? "Choose an option"}
          >
            {!isPlaceholder && selected ? (
              <span
                key={current}
                className={cn(styles.triggerContents, styles.selectionChange)}
              >
                {person && current && <Avatar option={selected} />}
                <span className={styles.personName}>{selected.label}</span>
              </span>
            ) : undefined}
          </Select.Value>
          <Select.Icon className={styles.chevron}>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            aria-label={props["aria-label"]}
            aria-labelledby={
              props["aria-label"] ? undefined : (props["aria-labelledby"] ?? id)
            }
            position="popper"
            sideOffset={8}
            collisionPadding={16}
            className={cn(system.glass, styles.menu)}
            style={themeStyle}
          >
            <Select.ScrollUpButton className={styles.scrollButton}>
              <span aria-hidden="true">⌃</span>
            </Select.ScrollUpButton>
            <Select.Viewport>
              {options
                .filter((option) => option.value || !option.disabled)
                .map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value || emptyOption}
                    disabled={option.disabled}
                    textValue={String(option.label)}
                    className={cn(
                      styles.option,
                      person && option.value && styles.personOption,
                    )}
                  >
                    {person && option.value && <Avatar option={option} />}
                    <Select.ItemText data-option-text="" title={option.label}>
                      {option.label}
                    </Select.ItemText>
                    <Select.ItemIndicator className={styles.indicator}>
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                      >
                        <path pathLength="1" d="m5 12 4 4L19 6" />
                      </svg>
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
            </Select.Viewport>
            <Select.ScrollDownButton className={styles.scrollButton}>
              <span aria-hidden="true">⌄</span>
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <select
        ref={native}
        name={name}
        value={current}
        required={required}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        className={styles.nativeBridge}
        onChange={(event) => change(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
        }}
      >
        {!empty && <option value="" />}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {invalid && (
        <span id={`${id}-required`} role="alert" className={system.fieldError}>
          Choose an option.
        </span>
      )}
    </>
  );
}
