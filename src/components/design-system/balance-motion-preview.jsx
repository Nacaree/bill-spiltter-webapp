"use client";

import { useState } from "react";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { DesignButton, DesignSurface } from "./primitives";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import styles from "./balance-motion-preview.module.css";

const startingBalance = 5300;
const formatBalance = (cents) => `$${(Math.round(cents) / 100).toFixed(2)}`;

export function BalanceMotionPreview() {
  const [cents, setCents] = useState(startingBalance);
  const reducedMotion = useDesignReducedMotion();

  return (
    <DesignSurface
      id="balance-motion"
      className={styles.preview}
      role="group"
      aria-labelledby="balance-motion-title"
    >
      <div className={styles.heading}>
        <h4 id="balance-motion-title">A balance that settles smoothly</h4>
        <p>
          {reducedMotion
            ? "Reduced motion: the balance updates immediately."
            : "NumberFlow rolls the digits over 1.1 seconds. Try it below."}
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.top}>
          <strong>You’re owed</strong>
          <span>USD</span>
        </div>
        <p className={styles.amount}>
          <AnimatedMoney amountMinor={cents} />
        </p>
        <p className={styles.caption}>From 2 people in this bill</p>
        <DesignButton
          variant="secondary"
          icon="arrow"
          iconPosition="end"
          className={styles.addExpense}
          onClick={() => setCents((value) => value + 1200)}
        >
          Add $12 expense
        </DesignButton>
      </div>
      <div className={styles.controls}>
        <DesignButton
          variant="secondary"
          onClick={() => setCents((value) => Math.max(0, value - 1200))}
          disabled={cents === 0}
        >
          Record $12 payment
        </DesignButton>
        <DesignButton
          variant="ghost"
          onClick={() => setCents(startingBalance)}
          disabled={cents === startingBalance}
        >
          Reset balance
        </DesignButton>
      </div>
      <p className={styles.note} role="status" aria-atomic="true">
        Sample balance: {formatBalance(cents)}. Preview only.
      </p>
    </DesignSurface>
  );
}
