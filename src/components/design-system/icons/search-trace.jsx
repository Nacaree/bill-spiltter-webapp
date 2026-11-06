"use client";

// Animate UI Search / Lucide geometry with a local circle-then-handle reveal.
// Original source and MIT + Commons Clause license: ./README.md and ./animate-ui/LICENSE.txt.
import { useEffect } from "react";
import {
  animate as animateValue,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { IconPathStyle, pathClassName } from "@animate-ui/react/icons";
import { useDesignReducedMotion } from "../use-design-reduced-motion";
import { searchTraceTiming } from "../motion-tokens";

const handle = "M16.6568542495 16.6568542495 L21 21";

export function SearchTrace({ size = 18, animate = false }) {
  const reducedMotion = useDesignReducedMotion();
  const active = animate && reducedMotion === false;
  const duration = searchTraceTiming.circle + searchTraceTiming.handle;
  const handoff = searchTraceTiming.circle / duration;
  const progress = useMotionValue(1);
  const circleProgress = useTransform(progress, [0, handoff, 1], [0, 1, 1]);
  const handleProgress = useTransform(progress, [0, handoff, 1], [0, 0, 1]);
  const handleOpacity = useTransform(progress, (value) =>
    value < handoff ? 0 : 1,
  );
  useEffect(() => {
    if (!active) {
      progress.set(1);
      return;
    }
    // A shared clock prevents the handle from flashing before the lens is complete.
    const animation = animateValue(progress, [0, 1], {
      duration,
      ease: "linear",
    });
    return () => animation.stop();
  }, [active, progress, duration]);
  return (
    <>
      <IconPathStyle />
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={pathClassName}
        data-icon-library="animate-ui"
        data-icon="search"
        data-icon-motion="circle-then-handle"
        aria-hidden="true"
      >
        <motion.circle
          cx={11}
          cy={11}
          r={8}
          transform="rotate(45 11 11)"
          data-search-phase="circle"
          style={{ pathLength: circleProgress }}
        />
        <motion.path
          d={handle}
          data-search-phase="handle"
          style={{ pathLength: handleProgress, opacity: handleOpacity }}
        />
      </svg>
    </>
  );
}
