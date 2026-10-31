"use client";

import { useEffect, useRef } from "react";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import { balanceChangeTiming } from "./motion-tokens";
import styles from "./balance-glow.module.css";

export function DesignBalanceGlow({
  active = false,
  duration = 24000,
  balanceMinor,
}) {
  const element = useRef(null);
  const previousBalance = useRef(balanceMinor);
  const reaction = useRef(null);
  const reducedMotion = useDesignReducedMotion();

  useEffect(() => {
    const changed = previousBalance.current !== balanceMinor;
    previousBalance.current = balanceMinor;

    if (!active || reducedMotion !== false || document.hidden) {
      reaction.current?.cancel();
      return;
    }
    if (!changed || !element.current?.animate) return;

    const currentFilter = getComputedStyle(element.current).filter;
    reaction.current?.cancel();
    reaction.current = element.current.animate(
      [
        {
          filter: currentFilter === "none" ? "brightness(1)" : currentFilter,
        },
        { filter: "brightness(1.18)", offset: 0.35 },
        { filter: "brightness(1)" },
      ],
      balanceChangeTiming,
    );
  }, [active, balanceMinor, reducedMotion]);

  useEffect(() => () => reaction.current?.cancel(), []);

  return (
    <span
      ref={element}
      className={styles.glow}
      data-balance-glow
      data-active={active}
      style={{ "--balance-glow-duration": `${duration}ms` }}
      aria-hidden="true"
    />
  );
}
