"use client";

import {
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { expenseFilterSpring, expenseFilterTiming } from "./motion-tokens";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import system from "./system.module.css";
import styles from "./expense-search.module.css";
import { ExpenseSearchClear } from "./expense-search-clear";
import { Search } from "./icons/animate-ui/search";
import { SearchTrace } from "./icons/search-trace";
import {
  ExpenseSearchMobileEffect,
  mobileSearchEffects,
} from "./expense-search-mobile-effect";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const filters = ["All", "Paid by you", "Receipts"];

export function ExpenseSearchIcon({ animate = false, customTrace = false }) {
  if (customTrace) return <SearchTrace animate={animate} />;
  return (
    <Search
      size={18}
      animate={animate}
      animation="path"
      aria-hidden="true"
      data-icon-library="animate-ui"
      data-icon="search"
    />
  );
}

export function ExpenseSearch({
  design = "tint",
  effect = "none",
  surface = "original",
  clearMotion = "none",
  value,
  onValueChange,
  filter,
  onFilterChange,
  label = "Search Atelier expenses",
  id,
}) {
  const inputId = useId();
  const input = useRef(null);
  const control = useRef(null);
  const iconFrames = useRef([]);
  const [iconPlaying, setIconPlaying] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const reducedMotion = useDesignReducedMotion();
  // Avoid discarding early typing before React attaches the event handlers.
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const morphing =
    design === "tint" && ["morph", "morph-press"].includes(effect);
  const mobileEffect = effect === "morph-press" ? "press" : effect;
  const stopIcon = useCallback(() => {
    iconFrames.current.forEach(cancelAnimationFrame);
    iconFrames.current = [];
    setIconPlaying(false);
  }, []);
  const playIcon = useCallback(() => {
    iconFrames.current.forEach(cancelAnimationFrame);
    setIconPlaying(false);
    // Reset the library controller between replays without replacing a pressed SVG.
    iconFrames.current = [
      requestAnimationFrame(() => {
        iconFrames.current = [
          requestAnimationFrame(() => {
            iconFrames.current = [];
            setIconPlaying(true);
          }),
        ];
      }),
    ];
  }, []);
  useEffect(() => () => iconFrames.current.forEach(cancelAnimationFrame), []);

  function closeSearchMode() {
    onValueChange("");
    setSearchMode(false);
    input.current?.blur();
    control.current?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={control}
      id={id}
      tabIndex={id || morphing ? -1 : undefined}
      className={styles.control}
      data-search-design={design}
      data-search-effect={effect}
      data-search-surface={surface}
      data-search-clear={clearMotion}
      role={id || morphing ? "group" : undefined}
      aria-label={id || morphing ? "Expense search and filters" : undefined}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.pointerFocus = "true";
      }}
      onKeyDownCapture={(event) => {
        if (event.key === "Tab")
          delete event.currentTarget.dataset.pointerFocus;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          delete event.currentTarget.dataset.pointerFocus;
      }}
    >
      <div
        className={styles.searchRow}
        data-search-mode={morphing && searchMode ? "open" : "closed"}
      >
        <div
          onPointerDown={(event) => {
            if (event.button === 0 && event.target === event.currentTarget) {
              event.preventDefault();
              input.current?.focus();
            }
          }}
          className={cn(
            styles.bar,
            design === "tint" && surface !== "underline" && system.glass,
          )}
          data-search-material={
            design === "tint" && surface !== "underline" ? "glass" : undefined
          }
        >
          {design === "tint" && mobileSearchEffects.includes(mobileEffect) && (
            <ExpenseSearchMobileEffect
              key={effect}
              effect={mobileEffect}
              drawOnPress={surface === "borderless" && effect === "morph-press"}
              onIconPlay={playIcon}
              onIconStop={stopIcon}
            />
          )}
          <label className={styles.icon} htmlFor={inputId}>
            <ExpenseSearchIcon
              animate={iconPlaying && reducedMotion === false}
              customTrace={surface === "borderless" && effect === "morph-press"}
            />
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
            onFocus={() => {
              if (morphing) setSearchMode(true);
            }}
            onClick={() => {
              if (morphing) setSearchMode(true);
            }}
            onKeyDown={(event) => {
              if (morphing && event.key === "Escape") {
                event.preventDefault();
                closeSearchMode();
              }
            }}
            onChange={(event) => onValueChange(event.target.value)}
          />
          <ExpenseSearchClear
            visible={Boolean(value)}
            variant={clearMotion}
            className={styles.clear}
            onClear={() => {
              onValueChange("");
              input.current?.setAttribute("data-search-clear-focus", "");
              input.current?.focus();
              input.current?.removeAttribute("data-search-clear-focus");
            }}
          />
        </div>
        {morphing && (
          <div className={styles.cancelSlot} inert={!searchMode}>
            <button
              type="button"
              className={styles.cancel}
              onClick={closeSearchMode}
              tabIndex={searchMode ? 0 : -1}
            >
              Cancel
            </button>
          </div>
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
