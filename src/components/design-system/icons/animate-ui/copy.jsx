// Adapted from https://animate-ui.com/r/icons-lucide-copy.json
// License and provenance: see LICENSE.txt and ../README.md.
"use client";
import { motion } from "motion/react";
import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
} from "@animate-ui/react/icons";
const animations = {
  default: {
    rect: {
      initial: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
      animate: { x: 1, y: 1, transition: { duration: 0.3, ease: "easeInOut" } },
    },
    path: {
      initial: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
      animate: {
        x: -1,
        y: -1,
        transition: { duration: 0.3, ease: "easeInOut" },
      },
    },
  },
  "default-loop": {
    rect: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, 1, 0],
        y: [0, 1, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
    path: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, -1, 0],
        y: [0, -1, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  },
  merge: {
    rect: {
      initial: {
        y: 0,
        x: 0,
      },
      animate: {
        y: -3,
        x: -3,
        transition: {
          duration: 0.3,
          ease: "easeInOut",
        },
      },
    },
    path: {
      initial: {
        y: 0,
        x: 0,
      },
      animate: {
        y: 3,
        x: 3,
        transition: {
          duration: 0.3,
          ease: "easeInOut",
        },
      },
    },
  },
  "merge-loop": {
    rect: {
      initial: {
        y: 0,
        x: 0,
      },
      animate: {
        y: [0, -3, 0],
        x: [0, -3, 0],
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        },
      },
    },
    path: {
      initial: {
        y: 0,
        x: 0,
      },
      animate: {
        y: [0, 3, 0],
        x: [0, 3, 0],
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        },
      },
    },
  },
};
function IconComponent({ size, ...props }) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect
        width={14}
        height={14}
        x={8}
        y={8}
        rx={2}
        ry={2}
        variants={variants.rect}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
        variants={variants.path}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
function Copy(props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
export { Copy, Copy as CopyIcon, animations };
