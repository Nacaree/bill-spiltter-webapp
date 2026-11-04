"use client";

import { useEffect, useRef } from "react";
import { receiptSpotlightTiming } from "./motion-tokens";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import styles from "./bill-entry-choices.module.css";

export function ReceiptArt({ playing = true }) {
  const root = useRef(null);
  const reducedMotion = useDesignReducedMotion();

  useEffect(() => {
    const art = root.current;
    if (!playing || reducedMotion !== false || !art?.animate) return;
    const paper = art.querySelector("[data-receipt-paper]");
    const scan = art.querySelector("[data-receipt-scan]");
    const { duration, floatDuration, lift, scanStart, scanEnd, easing } =
      receiptSpotlightTiming;
    const distance = Math.max(0, paper.clientHeight - 16 - scan.offsetHeight);
    const highlight = getComputedStyle(art).color;
    const timing = { duration, iterations: Infinity, easing: "linear" };
    const animations = [
      art.animate(
        [
          { transform: "translateY(0)", offset: 0, easing },
          { transform: `translateY(-${lift}px)`, offset: 0.5, easing },
          { transform: "translateY(0)", offset: 1 },
        ],
        { ...timing, duration: floatDuration },
      ),
      scan.animate(
        [
          { transform: "translateY(0)", opacity: 0, offset: 0 },
          { transform: "translateY(0)", opacity: 0, offset: scanStart - 0.02 },
          { transform: "translateY(0)", opacity: 0.65, offset: scanStart },
          {
            transform: `translateY(${distance}px)`,
            opacity: 0.65,
            offset: scanEnd,
          },
          {
            transform: `translateY(${distance}px)`,
            opacity: 0,
            offset: scanEnd + 0.03,
          },
          { transform: `translateY(${distance}px)`, opacity: 0, offset: 1 },
        ],
        timing,
      ),
      ...[...art.querySelectorAll("[data-receipt-line]")].map((line) => {
        const position = Math.min(
          1,
          Math.max(
            0,
            (line.offsetTop +
              line.offsetHeight / 2 -
              scan.offsetTop -
              scan.offsetHeight / 2) /
              (distance || 1),
          ),
        );
        const peak = scanStart + position * (scanEnd - scanStart);
        const ink = getComputedStyle(line).backgroundColor;
        return line.animate(
          [
            { backgroundColor: ink, offset: 0 },
            { backgroundColor: ink, offset: peak - 0.025, easing },
            { backgroundColor: highlight, offset: peak, easing },
            { backgroundColor: ink, offset: peak + 0.035 },
            { backgroundColor: ink, offset: 1 },
          ],
          timing,
        );
      }),
    ];
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    let inView = false;
    function update() {
      const running = inView && !document.hidden;
      animations.forEach((animation) =>
        running ? animation.play() : animation.pause(),
      );
      art.dataset.receiptMotion = running ? "running" : "paused";
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        update();
      },
      { threshold: 0.25 },
    );
    observer.observe(art.parentElement);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      animations.forEach((animation) => animation.cancel());
      delete art.dataset.receiptMotion;
    };
  }, [playing, reducedMotion]);

  return (
    <span
      ref={root}
      className={styles.receiptArt}
      data-receipt-art
      aria-hidden="true"
    >
      <span className={styles.receiptBack} />
      <span className={styles.receiptPaper} data-receipt-paper>
        <span className={styles.receiptMark} />
        <span className={styles.paperLine} data-receipt-line />
        <span className={styles.paperLine} data-receipt-line />
        <span className={styles.paperTotal} data-receipt-line />
        <span className={styles.receiptScan} data-receipt-scan />
      </span>
    </span>
  );
}
