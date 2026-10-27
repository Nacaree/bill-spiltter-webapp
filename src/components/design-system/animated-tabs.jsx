"use client";

import { useDesignReducedMotion } from "./use-design-reduced-motion";

import { useId } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useIsPresent,
} from "motion/react";
import { motionTransition } from "./motion-tokens";
import styles from "./animated-tabs.module.css";

export function AnimatedTabs({ id, label, tabs, value, onValueChange }) {
  const groupId = useId();
  const reducedMotion = useDesignReducedMotion();
  return (
    <LayoutGroup id={groupId}>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            id={`${id}-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={value === tab}
            aria-controls={`${id}-panel-${tab}`}
            tabIndex={value === tab ? 0 : -1}
            onClick={() => onValueChange(tab)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? tabs[(index + 1) % tabs.length]
                  : event.key === "ArrowLeft"
                    ? tabs[(index - 1 + tabs.length) % tabs.length]
                    : event.key === "Home"
                      ? tabs[0]
                      : event.key === "End"
                        ? tabs[tabs.length - 1]
                        : null;
              if (next) {
                event.preventDefault();
                onValueChange(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }
            }}
          >
            {tab}
            {value === tab && (
              <motion.span
                aria-hidden="true"
                className={styles.indicator}
                layoutId="tab-indicator"
                transition={motionTransition(reducedMotion)}
              />
            )}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

function Panel({ id, value, children }) {
  const present = useIsPresent();
  const reducedMotion = useDesignReducedMotion();
  return (
    <motion.div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      aria-hidden={!present || undefined}
      inert={!present || undefined}
      tabIndex={present ? 0 : -1}
      className={styles.panel}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={motionTransition(reducedMotion, 0.16)}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedTabPanels({ id, value, children }) {
  return (
    <div className={styles.viewport}>
      <AnimatePresence initial={false}>
        <Panel key={value} id={id} value={value}>
          {children}
        </Panel>
      </AnimatePresence>
    </div>
  );
}
