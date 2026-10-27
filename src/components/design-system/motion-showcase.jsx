"use client";

import { useDesignReducedMotion } from "./use-design-reduced-motion";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { DesignButton, DesignSurface } from "./primitives";
import { motionTiming, motionTransition } from "./motion-tokens";
import styles from "./motion-showcase.module.css";

const sampleExpenses = [
  {
    id: "dinner",
    name: "Weekend dinner",
    amount: "$48.00",
    detail: "Paid by you · shared equally",
  },
  {
    id: "coffee",
    name: "Coffee after dinner",
    amount: "$6.00",
    detail: "Paid by Sokha · shared equally",
  },
  {
    id: "ride",
    name: "Ride home",
    amount: "$9.00",
    detail: "Paid by Mali · shared equally",
  },
  {
    id: "dessert",
    name: "Something sweet",
    amount: "$12.00",
    detail: "Paid by you · shared equally",
  },
];

export function MotionShowcase({ onPreviewDialog }) {
  const reducedMotion = useDesignReducedMotion();
  const [added, setAdded] = useState(0);
  const [shimmer, setShimmer] = useState(false);
  const [shimmerRun, setShimmerRun] = useState(0);
  const [success, setSuccess] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function playShimmer() {
    clearTimeout(timer.current);
    setShimmerRun((current) => current + 1);
    setShimmer(true);
    timer.current = setTimeout(() => setShimmer(false), 2000);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div id="motion-playground" className={styles.showcase}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>MOTION PLAYGROUND</p>
            <h3>Quiet movement. Clear feedback.</h3>
            <p>Try a small interaction, then watch it settle.</p>
          </div>
          <span className={styles.timing}>
            {reducedMotion
              ? "Reduced motion on"
              : "Short transitions · minimal bounce"}
          </span>
        </div>
        <DesignSurface className={styles.expenseCard}>
          <div className={styles.cardHeading}>
            <div>
              <h4>An expense finds its place</h4>
              <p>A soft reveal keeps the list easy to follow.</p>
            </div>
            <span className={styles.number}>01</span>
          </div>
          <ul className={styles.ledger} aria-label="Sample expense motion">
            <AnimatePresence initial={false}>
              {sampleExpenses.slice(0, added + 1).map((expense) => (
                <motion.li
                  key={expense.id}
                  layout="position"
                  initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={motionTransition(
                    reducedMotion,
                    motionTiming.reveal,
                  )}
                >
                  <div className={styles.ledgerRow}>
                    <span className={styles.expenseIcon} aria-hidden="true">
                      ↗
                    </span>
                    <span className={styles.expenseText}>
                      <strong>{expense.name}</strong>
                      <span>{expense.detail}</span>
                    </span>
                    <strong className={styles.amount}>{expense.amount}</strong>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className={styles.actions}>
            <DesignButton
              onClick={() => setAdded((current) => Math.min(current + 1, 3))}
              disabled={added === 3}
            >
              Add sample expense
            </DesignButton>
            <DesignButton
              variant="ghost"
              onClick={() => setAdded(0)}
              disabled={added === 0}
            >
              Reset list
            </DesignButton>
            <p role="status">
              {added + 1} sample {added ? "expenses" : "expense"}. Preview only.
            </p>
          </div>
        </DesignSurface>
        <div className={styles.grid}>
          <DesignSurface>
            <div className={styles.cardHeading}>
              <div>
                <h4>A soft shimmer on glass</h4>
                <p>
                  {reducedMotion
                    ? "Reduced motion: a still highlight replaces the sweep."
                    : "Hover over the glass or replay the soft shimmer."}
                </p>
              </div>
              <span className={styles.number}>02</span>
            </div>
            <div className={styles.glassStage}>
              <DesignSurface
                glass
                className={styles.glassCard}
                data-shimmer={shimmer ? "active" : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && !reducedMotion)
                    playShimmer();
                }}
              >
                <span className={styles.shimmerMask} aria-hidden="true">
                  <span
                    key={shimmerRun}
                    className={styles.shimmerBeam}
                    data-shimmer-beam={shimmer ? "active" : "idle"}
                  />
                </span>
                <span>YOUR BALANCE</span>
                <strong>$24.50</strong>
                <p>Ready to settle up</p>
              </DesignSurface>
            </div>
            <DesignButton variant="secondary" onClick={playShimmer}>
              Replay shimmer
            </DesignButton>
          </DesignSurface>
          <DesignSurface>
            <div className={styles.cardHeading}>
              <div>
                <h4>A calm confirmation</h4>
                <p>A drawn check acknowledges the action.</p>
              </div>
              <span className={styles.number}>03</span>
            </div>
            <div className={styles.successStage} role="status">
              {success > 0 ? (
                <motion.div
                  key={success}
                  className={styles.successMessage}
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={motionTransition(reducedMotion)}
                >
                  <span className={styles.successCircle}>
                    <motion.svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <motion.path
                        d="m5 12 4 4L19 6"
                        initial={reducedMotion ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={motionTransition(
                          reducedMotion,
                          motionTiming.reveal,
                        )}
                      />
                    </motion.svg>
                  </span>
                  <strong>Payment recorded</strong>
                  <p>Sample confirmation · $16.00</p>
                </motion.div>
              ) : (
                <div className={styles.successMessage}>
                  <span className={styles.idleCircle} aria-hidden="true">
                    ✓
                  </span>
                  <strong>A clear moment of completion.</strong>
                  <p>Replay the success feedback below.</p>
                </div>
              )}
            </div>
            <DesignButton
              variant="secondary"
              onClick={() => setSuccess((current) => current + 1)}
            >
              Preview success
            </DesignButton>
          </DesignSurface>
        </div>
        <div className={styles.more}>
          <p>Keep exploring</p>
          <a href="#person-picker">
            Open the person picker <span aria-hidden="true">↗</span>
          </a>
          <a href="#patterns">
            Try the sliding tabs <span aria-hidden="true">↗</span>
          </a>
          <DesignButton variant="ghost" onClick={onPreviewDialog}>
            Preview dialog <span aria-hidden="true">↗</span>
          </DesignButton>
        </div>
      </div>
    </MotionConfig>
  );
}
