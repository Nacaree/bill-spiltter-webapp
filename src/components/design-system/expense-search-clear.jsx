"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { X } from "./icons/animate-ui/x";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import { searchClearTiming } from "./motion-tokens";

function AnimatedClear({ variant, className, onClear }) {
  const reducedMotion = useDesignReducedMotion();
  const present = useIsPresent();
  const button = useRef(null);
  const moving = reducedMotion === false;

  useEffect(() => {
    if (present || !moving || variant !== "erase") return;
    const animations = [...button.current.querySelectorAll("svg line")].map(
      (line) => {
        const length = line.getTotalLength();
        return line.animate(
          [
            { strokeDasharray: `${length} ${length}`, strokeDashoffset: "0" },
            {
              strokeDasharray: `0 ${length * 2}`,
              strokeDashoffset: `${-length / 2}`,
            },
          ],
          {
            duration: searchClearTiming.erase,
            easing: "ease-in",
            fill: "forwards",
          },
        );
      },
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, [present, moving, variant]);

  const enter =
    moving && variant === "pop"
      ? { type: "spring", stiffness: 520, damping: 25, mass: 0.6 }
      : { duration: moving ? searchClearTiming.enter : 0 };
  return (
    <motion.span
      data-clear-slot={variant}
      data-clear-present={String(present)}
      aria-hidden={!present || undefined}
      style={{
        display: "block",
        flex: "0 0 auto",
        overflow: present ? "visible" : "hidden",
      }}
      initial={{ width: moving ? 0 : 44, marginLeft: moving ? -10 : 0 }}
      animate={{ width: 44, marginLeft: 0 }}
      exit={{ width: 0, marginLeft: -10 }}
      transition={{
        duration: moving ? searchClearTiming.exit : 0,
        ease: "easeOut",
      }}
    >
      <motion.button
        ref={button}
        type="button"
        className={className}
        data-clear-motion={variant}
        aria-label="Clear search"
        disabled={!present}
        tabIndex={present ? 0 : -1}
        onClick={onClear}
        style={{ pointerEvents: present ? "auto" : "none" }}
        initial={{
          opacity: moving ? 0 : 1,
          scale: moving ? (variant === "pop" ? 0.55 : 0.9) : 1,
        }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{
          opacity: 0,
          scale: moving ? (variant === "erase" ? 1 : 0.65) : 1,
        }}
        whileTap={
          moving ? { scale: variant === "pop" ? 0.85 : 0.94 } : undefined
        }
        transition={enter}
      >
        <X
          size={16}
          animate={moving && !present && variant === "twist"}
          speed={searchClearTiming.twistSpeed}
          aria-hidden="true"
        />
      </motion.button>
    </motion.span>
  );
}

export function ExpenseSearchClear({
  visible,
  variant = "none",
  className,
  onClear,
}) {
  if (variant === "none")
    return visible ? (
      <button
        type="button"
        className={className}
        aria-label="Clear search"
        onClick={onClear}
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
    ) : null;
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <AnimatedClear
          key={variant}
          variant={variant}
          className={className}
          onClear={onClear}
        />
      )}
    </AnimatePresence>
  );
}
