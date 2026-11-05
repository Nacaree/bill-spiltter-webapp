"use client";

import { useEffect, useRef } from "react";
import { addExpenseStrokeTiming } from "./motion-tokens";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import styles from "./button-stroke-shimmer.module.css";

// Overlapping translucent strokes give the light a smooth, tapered tail.
const glintLayers = Array.from(
  { length: 24 },
  (_, index) => (12 * (24 - index)) / 24,
);
const strokeShape = {
  x: 0.75,
  y: 0.75,
  width: "100%",
  height: "100%",
  rx: 21.25,
  pathLength: 100,
};

export function ButtonStrokeShimmer({ playing = true }) {
  const root = useRef(null);
  const beam = useRef(null);
  const enabled = useRef(playing);
  const updatePlayback = useRef(null);
  const reducedMotion = useDesignReducedMotion();

  useEffect(() => {
    enabled.current = playing;
    updatePlayback.current?.();
  }, [playing]);

  useEffect(() => {
    const border = root.current;
    const light = beam.current;
    if (reducedMotion !== false || !border || !light?.animate) return;
    const { duration } = addExpenseStrokeTiming;
    // SVG pathLength normalizes distance around the rounded edge, including corners.
    const animations = [
      light.animate(
        [{ strokeDashoffset: "0px" }, { strokeDashoffset: "100px" }],
        { duration, iterations: Infinity, easing: "linear" },
      ),
    ];
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let inView = false;
    function update() {
      const running =
        inView &&
        enabled.current &&
        !forcedColors.matches &&
        !document.hidden &&
        !document.body.hasAttribute("data-scroll-locked");
      animations.forEach((animation) =>
        running ? animation.play() : animation.pause(),
      );
      border.dataset.strokeMotion = running ? "running" : "paused";
    }
    updatePlayback.current = update;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        update();
      },
      { threshold: 0.25 },
    );
    visibility.observe(border.closest("button") ?? border);
    const dialogs = new MutationObserver(update);
    dialogs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
    });
    document.addEventListener("visibilitychange", update);
    forcedColors.addEventListener("change", update);
    update();
    return () => {
      visibility.disconnect();
      dialogs.disconnect();
      document.removeEventListener("visibilitychange", update);
      forcedColors.removeEventListener("change", update);
      animations.forEach((animation) => animation.cancel());
      updatePlayback.current = null;
      border.dataset.strokeMotion = "still";
    };
  }, [reducedMotion]);

  return (
    <svg
      ref={root}
      className={styles.border}
      data-border-shimmer
      data-stroke-motion="still"
      aria-hidden="true"
      focusable="false"
    >
      <g ref={beam}>
        {glintLayers.map((length) => (
          <rect
            {...strokeShape}
            key={length}
            strokeDasharray={`${length} ${100 - length}`}
          />
        ))}
      </g>
    </svg>
  );
}
