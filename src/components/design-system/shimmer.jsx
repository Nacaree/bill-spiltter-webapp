"use client";

import styles from "./shimmer.module.css";

// Shared with the motion playground: one soft sweep, never a continuous loop.
export function DesignShimmer({ active = true, run = 0 }) {
  return (
    <span className={styles.shimmerMask} data-shimmer-mask aria-hidden="true">
      <span
        key={run}
        className={styles.shimmerBeam}
        data-shimmer-beam={active ? "active" : "idle"}
      />
    </span>
  );
}
