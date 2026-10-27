"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DayPicker } from "@daypicker/react";
import { Popover } from "@animate-ui/react/primitives/radix-ui/popover";
import { Dialog } from "@animate-ui/react/primitives/radix-ui/dialog";
import { useDesignReducedMotion } from "@/components/design-system/use-design-reduced-motion";
import { motionTiming } from "@/components/design-system/motion-tokens";
import system from "@/components/design-system/system.module.css";
import "@daypicker/react/style.css";
import styles from "./date-picker.module.css";

const compactQuery = "(max-width: 639px), (max-height: 650px)";
function subscribeCompact(onChange) {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function compactSnapshot() {
  return window.matchMedia(compactQuery).matches;
}
function serverCompactSnapshot() {
  return null;
}

// Date-only values stay in the local calendar, without UTC conversions.
function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}
function dateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatPickerDate(value) {
  const date = calendarDate(value);
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    : "Choose a date";
}
function CalendarIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18" />
    </svg>
  );
}

export function DatePicker({
  id,
  label,
  value,
  onValueChange,
  disabled = false,
}) {
  const compact = useSyncExternalStore(
    subscribeCompact,
    compactSnapshot,
    serverCompactSnapshot,
  );
  const [centerWhenTight, setCenterWhenTight] = useState(false);
  const modal = Boolean(compact || centerWhenTight);
  const Primitive = modal ? Dialog : Popover;
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => calendarDate(value));
  const [today, setToday] = useState(null);
  const reducedMotion = useDesignReducedMotion();
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const selected = calendarDate(value);
  function changeOpen(next) {
    clearTimeout(closeTimer.current);
    if (next) {
      const bounds = trigger.current?.getBoundingClientRect();
      // Six fixed weeks and the shortcut footer need about 500px. Use the
      // centered presentation when neither side of the field has that room.
      setCenterWhenTight(
        Boolean(
          bounds &&
          Math.max(bounds.top - 16, window.innerHeight - bounds.bottom - 26) <
            500,
        ),
      );
      const current = new Date();
      setToday(current);
      setMonth(selected ?? current);
    }
    setOpen(next);
  }
  function select(date) {
    if (!date) return;
    clearTimeout(closeTimer.current);
    onValueChange(dateValue(date));
    if (reducedMotion !== false) setOpen(false);
    else closeTimer.current = setTimeout(() => setOpen(false), 150);
  }
  function shortcut(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    date.setHours(12, 0, 0, 0);
    select(date);
  }
  const content = (
    <Primitive.Content
      aria-label={`${label} calendar`}
      aria-describedby={undefined}
      {...(!modal && {
        align: "start",
        sideOffset: 10,
        collisionPadding: 16,
      })}
      className={`${system.glass} ${styles.popover} ${modal ? styles.modalPanel : ""}`}
      transition={{
        duration: reducedMotion === false ? 0.24 : 0,
        ease: motionTiming.ease,
      }}
      exitTransition={{
        duration: reducedMotion === false ? 0.14 : 0,
        ease: motionTiming.ease,
      }}
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      {modal && (
        <Dialog.Title className="sr-only">{label} calendar</Dialog.Title>
      )}
      <div className={styles.calendarHeader}>
        <p className={styles.eyebrow}>{label}</p>
        <Primitive.Close
          className={styles.close}
          aria-label="Close calendar"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </Primitive.Close>
      </div>
      <DayPicker
        className={styles.calendar}
        mode="single"
        required
        selected={selected}
        onSelect={select}
        month={month}
        onMonthChange={setMonth}
        today={today ?? undefined}
        autoFocus
        animate={reducedMotion === false}
        showOutsideDays
        fixedWeeks
        navLayout="around"
        aria-label={`${label} dates`}
      />
      <div className={styles.shortcuts}>
        <button type="button" onClick={() => shortcut(0)}>
          Today
        </button>
        <button type="button" onClick={() => shortcut(-1)}>
          Yesterday
        </button>
      </div>
    </Primitive.Content>
  );
  return (
    <div className={styles.field}>
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <Primitive.Root open={open} onOpenChange={changeOpen}>
        <Primitive.Trigger asChild>
          <button
            ref={trigger}
            id={id}
            type="button"
            disabled={disabled || compact === null}
            className={styles.trigger}
            aria-labelledby={`${id}-label ${id}-value`}
          >
            <span id={`${id}-value`}>{formatPickerDate(value)}</span>
            <CalendarIcon />
          </button>
        </Primitive.Trigger>
        <Primitive.Portal>
          {modal ? (
            <>
              <Dialog.Overlay
                className={styles.overlay}
                transition={{ duration: reducedMotion === false ? 0.24 : 0 }}
                exitTransition={{
                  duration: reducedMotion === false ? 0.14 : 0,
                }}
              />
              <div className={styles.modalFrame}>{content}</div>
            </>
          ) : (
            content
          )}
        </Primitive.Portal>
      </Primitive.Root>
    </div>
  );
}
