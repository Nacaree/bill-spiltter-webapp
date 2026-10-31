"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { cn } from "@/lib/cn";
import { DesignBalanceGlow } from "./balance-glow";
import { DesignBalanceContours } from "./balance-contours";
import { DesignShimmer } from "./shimmer";
import { DesignButton, DesignSurface } from "./primitives";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import styles from "./balance-motion-preview.module.css";
import ringStyles from "./balance-rings.module.css";

export function BalanceBackgroundPreview() {
  const root = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [fast, setFast] = useState(true);
  const [run, setRun] = useState(0);
  const [cents, setCents] = useState(5300);
  const active = reducedMotion === false && playing && visible;

  useEffect(() => {
    let inView = false;
    function update() {
      setVisible(inView && !document.hidden);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0 },
    );
    observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  function replay() {
    setRun((value) => value + 1);
    setPlaying(true);
  }

  return (
    <DesignSurface
      id="balance-background"
      className={styles.preview}
      role="group"
      aria-labelledby="balance-background-title"
    >
      <div ref={root}>
        <div className={styles.heading}>
          <h4 id="balance-background-title">Balance background</h4>
          <p>
            Eight evenly spaced arcs lean downward to the right. Smaller
            clusters enter from the upper-left and lower-left corners.
          </p>
        </div>
        <div className={styles.comparison}>
          {[false, true].map((contours) => (
            <figure key={String(contours)} className={styles.comparisonItem}>
              <figcaption>
                {contours ? "Screen 2 contours" : "Previous two arcs"}
              </figcaption>
              <div
                key={run}
                className={cn(
                  styles.card,
                  contours ? styles.contourCard : ringStyles.rings,
                )}
                data-background-example={contours ? "contours" : "current"}
                data-rings-playing={!contours && active}
                style={{
                  "--ring-inner-duration": fast ? "1833ms" : "11000ms",
                  "--ring-outer-duration": fast ? "2333ms" : "14000ms",
                  "--ring-phase": fast ? "-292ms" : "-1750ms",
                }}
              >
                {contours && (
                  <DesignBalanceContours
                    active={active}
                    duration={fast ? 1500 : 9000}
                  />
                )}
                <DesignBalanceGlow
                  active={active}
                  duration={fast ? 4000 : 24000}
                  balanceMinor={cents}
                />
                <DesignShimmer active={active} run={run} />
                <div className={styles.top}>
                  <strong>You’re owed</strong>
                  <span>USD</span>
                </div>
                <p className={styles.amount}>
                  <AnimatedMoney amountMinor={cents} />
                </p>
                <p className={styles.caption}>From 2 people in this bill</p>
              </div>
            </figure>
          ))}
        </div>
        <div
          className={styles.controls}
          role="group"
          aria-label="Sample balance actions"
        >
          <DesignButton onClick={() => setCents((value) => value + 1200)}>
            Add $12 expense
          </DesignButton>
          <DesignButton
            variant="secondary"
            onClick={() => setCents((value) => Math.max(0, value - 1200))}
            disabled={cents === 0}
          >
            Record $12 payment
          </DesignButton>
          <DesignButton
            variant="ghost"
            onClick={() => setCents(5300)}
            disabled={cents === 5300}
          >
            Reset balance
          </DesignButton>
        </div>
        <div className={styles.controls}>
          <DesignButton
            variant="secondary"
            icon="replay"
            onClick={replay}
            disabled={reducedMotion !== false}
          >
            Replay background
          </DesignButton>
          <DesignButton
            variant="secondary"
            onClick={() => {
              setFast((value) => !value);
              replay();
            }}
            disabled={reducedMotion !== false}
          >
            {fast ? "Use natural speed" : "Show movement faster"}
          </DesignButton>
          <DesignButton
            variant="ghost"
            onClick={() => setPlaying((value) => !value)}
            disabled={reducedMotion !== false}
          >
            {playing ? "Pause background" : "Play background"}
          </DesignButton>
        </div>
        <p className={styles.note} role="status">
          {reducedMotion
            ? "Reduced motion is on. Both backgrounds stay still."
            : fast
              ? "Fast preview: contour drift 1.5s. Use natural speed for its 9-second loop."
              : "Contour drift: 9 seconds, matching Screen 2."}
        </p>
      </div>
    </DesignSurface>
  );
}
