// Adapted from https://animate-ui.com/r/icons-lucide-ellipsis.json
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
        transition: { type: "spring", stiffness: 60, damping: 10 },
      },
      animate: {
        rotate: 180,
        transition: { type: "spring", stiffness: 60, damping: 10 },
      },
    },
    circle1: {},
    circle2: {},
    circle3: {},
  },
  vertical: {
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
    circle1: {},
    circle2: {},
    circle3: {},
  },
  jump: {
    group: {},
    circle1: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 2],
        transition: {
          duration: 1.2,
          delay: 0.4,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        },
      },
    },
    circle2: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 2],
        transition: {
          duration: 1.2,
          delay: 0.2,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        },
      },
    },
    circle3: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 2],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        },
      },
    },
  },
  pulse: {
    group: {},
    circle1: {
      initial: {
        scale: 1,
      },
      animate: {
        scale: [1, 1.5, 1],
        transition: {
          duration: 1,
          delay: 0.4,
          ease: "easeInOut",
        },
      },
    },
    circle2: {
      initial: {
        scale: 1,
      },
      animate: {
        scale: [1, 1.5, 1],
        transition: {
          duration: 1,
          delay: 0.2,
          ease: "easeInOut",
        },
      },
    },
    circle3: {
      initial: {
        scale: 1,
      },
      animate: {
        scale: [1, 1.5, 1],
        transition: {
          duration: 1,
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
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      <motion.circle
        cx={19}
        cy={12}
        r={1}
        variants={variants.circle1}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx={12}
        cy={12}
        r={1}
        variants={variants.circle2}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx={5}
        cy={12}
        r={1}
        variants={variants.circle3}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Ellipsis(props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export { animations, Ellipsis, Ellipsis as EllipsisIcon };
