"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import {
  expenseFilterSpring,
  expenseFilterTiming,
  searchFocusTiming,
  searchIconTiming,
} from "./motion-tokens";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import system from "./system.module.css";
import styles from "./expense-search.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const filters = ["All", "Paid by you", "Receipts"];

export function ExpenseSearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function ExpenseSearch({
  design = "tint",
  value,
  onValueChange,
  filter,
  onFilterChange,
  label = "Search Atelier expenses",
  id,
}) {
  const inputId = useId();
  const input = useRef(null);
  const icon = useRef(null);
  const bar = useRef(null);
  const animations = useRef([]);
  const reducedMotion = useDesignReducedMotion();
  // Avoid discarding early typing before React attaches the event handlers.
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);

  useEffect(() => {
    if (reducedMotion !== false)
      animations.current.forEach((animation) => animation.cancel());
    return () => {
      animations.current.forEach((animation) => animation.cancel());
    };
  }, [design, reducedMotion]);

  function replayFocusEffect() {
    animations.current.forEach((animation) => animation.cancel());
    if (
      design !== "tint" ||
      reducedMotion !== false ||
      !icon.current?.animate ||
      !bar.current?.animate
    )
      return;
    const currentStyle = getComputedStyle(bar.current);
    const ink = currentStyle.color;
    const halo = `color-mix(in srgb, ${ink} 10%, transparent)`;
    const settledHalo = `color-mix(in srgb, ${ink} 6%, transparent)`;
    animations.current = [
      icon.current.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.08)", offset: 0.45 },
          { transform: "scale(1)" },
        ],
        searchIconTiming,
      ),
      bar.current.animate(
        [
          {
            boxShadow:
              currentStyle.boxShadow === "none"
                ? "0 0 0 0 transparent, 0 0 0 0 transparent"
                : currentStyle.boxShadow,
          },
          {
            boxShadow: `0 0 0 1px ${ink}, 0 0 0 6px ${halo}`,
            offset: 0.5,
          },
          { boxShadow: `0 0 0 1px ${ink}, 0 0 0 3px ${settledHalo}` },
        ],
        searchFocusTiming,
      ),
    ];
  }

  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={styles.control}
      data-search-design={design}
      role={id ? "group" : undefined}
      aria-label={id ? "Expense search and filters" : undefined}
    >
      <div
        ref={bar}
        className={cn(styles.bar, design === "tint" && system.glass)}
        data-search-material={design === "tint" ? "glass" : undefined}
      >
        <label ref={icon} className={styles.icon} htmlFor={inputId}>
          <ExpenseSearchIcon />
          <span className={styles.srOnly}>{label}</span>
        </label>
        <input
          ref={input}
          id={inputId}
          className={styles.field}
          type="search"
          placeholder="Find an expense"
          value={value}
          readOnly={!ready}
          onClick={replayFocusEffect}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.repeat) replayFocusEffect();
          }}
          onBlur={() =>
            animations.current.forEach((animation) => animation.cancel())
          }
          onChange={(event) => onValueChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => {
              onValueChange("");
              input.current?.focus();
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter expenses"
        style={{
          "--filter-duration": `${expenseFilterTiming.duration}ms`,
          "--filter-easing": expenseFilterTiming.easing,
        }}
      >
        {design === "tint" && (
          <span aria-hidden="true" className={styles.indicatorRail}>
            <motion.span
              className={styles.filterIndicator}
              initial={false}
              animate={{
                x: `${Math.max(0, filters.indexOf(filter)) * 100}%`,
              }}
              transition={
                reducedMotion !== false ? { duration: 0 } : expenseFilterSpring
              }
            >
              <span className={styles.filterStroke} />
            </motion.span>
          </span>
        )}
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            disabled={!ready}
            aria-pressed={filter === item}
            onClick={() => onFilterChange(item)}
          >
            <span className={styles.filterLabel}>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
