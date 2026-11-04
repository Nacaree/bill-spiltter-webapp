"use client";

// Outline and detail paths adapted from Lucide receipt-text (ISC).
// Source and license: ./README.md and ./lucide-LICENSE.txt.
import { motion } from "motion/react";
import { navigationIconTiming } from "../motion-tokens";
import { useDesignReducedMotion } from "../use-design-reduced-motion";

export function ReceiptText({ size = 20, animate = false, ...props }) {
  const reducedMotion = useDesignReducedMotion();
  const active = animate && reducedMotion === false;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon="receipt-text"
      initial={{ y: 0 }}
      animate={
        active ? { y: [0, -navigationIconTiming.receiptLift, 0] } : { y: 0 }
      }
      transition={{
        duration: active ? navigationIconTiming.duration : 0,
        times: [0, 0.4, 1],
        ease: "easeInOut",
      }}
      {...props}
    >
      <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
      {["M8 9h6", "M8 14h8"].map((path) => (
        <motion.path
          key={path}
          d={path}
          data-receipt-detail=""
          initial={{ pathLength: active ? 0 : 1, opacity: active ? 0 : 1 }}
          animate={
            active
              ? { pathLength: [0, 1], opacity: [0, 1] }
              : { pathLength: 1, opacity: 1 }
          }
          transition={{
            pathLength: {
              duration: active ? navigationIconTiming.receiptLineDuration : 0,
              ease: navigationIconTiming.ease,
            },
            // Both strokes write together at full ink opacity.
            opacity: {
              duration: 0,
            },
          }}
        />
      ))}
    </motion.svg>
  );
}
