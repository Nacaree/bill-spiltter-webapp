// Adapted from https://animate-ui.com/r/icons-lucide-clock-3.json
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
    circle: {},
    line1: {
      initial: {
        rotate: 0,
        transition: { ease: "easeInOut", duration: 0.6 },
      },
      animate: {
        transformOrigin: "bottom left",
        rotate: [0, 20, 0],
        transition: { ease: "easeInOut", duration: 0.6 },
      },
    },
    line2: {
      initial: {
        rotate: 0,
        transition: { ease: "easeInOut", duration: 0.6 },
      },
      animate: {
        transformOrigin: "bottom left",
        rotate: 360,
        transition: { ease: "easeInOut", duration: 0.6 },
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
      <motion.circle
        cx={12}
        cy={12}
        r={10}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={16.5}
        y1={12}
        x2={12}
        y2={12}
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={12}
        y1={6}
        x2={12}
        y2={12}
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
function Clock3(props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
export { Clock3, Clock3 as Clock3Icon, animations };
