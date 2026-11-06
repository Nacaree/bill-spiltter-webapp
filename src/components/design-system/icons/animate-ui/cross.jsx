// Adapted from https://animate-ui.com/r/icons-lucide-cross.json
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
        transition: { type: "spring", stiffness: 100, damping: 12 },
      },
      animate: {
        rotate: 90,
        transition: { type: "spring", stiffness: 100, damping: 12 },
      },
    },
    path: {},
  },
  x: {
    group: {
      initial: {
        rotate: 0,
        transition: { type: "spring", stiffness: 100, damping: 12 },
      },
      animate: {
        rotate: 45,
        transition: { type: "spring", stiffness: 100, damping: 12 },
      },
    },
    path: {},
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
        d="M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z"
        variants={variants.path}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
function Cross(props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
export { Cross, Cross as CrossIcon, animations };
