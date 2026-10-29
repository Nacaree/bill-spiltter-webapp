// Adapted from https://animate-ui.com/r/icons-lucide-rotate-ccw.json
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
    group: {
      initial: {
        rotate: 0,
        transition: { type: "spring", stiffness: 150, damping: 25 },
      },
      animate: {
        rotate: -45,
        transition: { type: "spring", stiffness: 150, damping: 25 },
      },
    },
    path1: {},
    path2: {},
  },
  rotate: {
    group: {
      initial: {
        rotate: 0,
        transition: { type: "spring", stiffness: 150, damping: 25 },
      },
      animate: {
        rotate: -360,
        transition: { type: "spring", stiffness: 150, damping: 25 },
      },
    },
    path1: {},
    path2: {},
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
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      <motion.path
        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        variants={variants.path1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M3 3v5h5"
        variants={variants.path2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function RotateCcw(props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export { animations, RotateCcw, RotateCcw as RotateCcwIcon };
