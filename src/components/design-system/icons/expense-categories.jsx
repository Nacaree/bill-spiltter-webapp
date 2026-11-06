// Lucide SVG geometry and original transport drawings with local Motion presets.
// Sources and license: see README.md and lucide-LICENSE.txt.
"use client";

import { motion } from "motion/react";
import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
} from "@animate-ui/react/icons";

function createCategoryIcon(name, shape, movement) {
  const animations = {
    default: {
      group: {
        initial: { x: 0, y: 0, rotate: 0, scale: 1, scaleY: 1 },
        animate: {
          ...movement,
          transition: { duration: 0.7, ease: "easeInOut" },
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
        <motion.g
          variants={variants.group}
          initial="initial"
          animate={controls}
          style={{ transformOrigin: "12px 12px" }}
        >
          {shape}
        </motion.g>
      </motion.svg>
    );
  }
  function CategoryIcon(props) {
    return <IconWrapper icon={IconComponent} {...props} />;
  }
  CategoryIcon.displayName = name;
  return CategoryIcon;
}

export const Utensils = createCategoryIcon(
  "Utensils",
  <>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </>,
  { rotate: [0, -7, 4, 0] },
);

export const ShoppingBasket = createCategoryIcon(
  "ShoppingBasket",
  <>
    <path d="m15 11-1 9" />
    <path d="m19 11-4-7" />
    <path d="M2 11h20" />
    <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
    <path d="M4.5 15.5h15" />
    <path d="m5 11 4-7" />
    <path d="m9 11 1 9" />
  </>,
  { y: [0, -1.5, 0], rotate: [0, -3, 3, 0] },
);

export const Car = createCategoryIcon(
  "Car",
  <>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </>,
  { x: [0, 1.5, -0.5, 0], y: [0, -0.5, 0, 0] },
);

// Original drawings: the same 24px grid, rounded caps and 2px outline.
export const TukTuk = createCategoryIcon(
  "TukTuk",
  <>
    <circle cx="5.5" cy="18" r="2.5" />
    <circle cx="19" cy="18" r="2.5" />
    <path d="M3 16H2V7a2 2 0 0 1 2-2h9l4 7h3a2 2 0 0 1 2 2v2h-1" />
    <path d="M8 18h8.5M2 9h13M11 5v10H4M17 12l-2 3" />
  </>,
  { x: [0, 0.8, 0], y: [0, -0.6, 0.2, 0] },
);

export const Motorbike = createCategoryIcon(
  "Motorbike",
  <>
    <circle cx="4.5" cy="17.5" r="3" />
    <circle cx="19.5" cy="17.5" r="3" />
    <path d="M4.5 17.5 8 11h4l3 6.5H8M12 11l3-3h2l2.5 9.5M15 8l-1-3h3M4 10h4M8 11l-1-3h4" />
  </>,
  { x: [0, 0.6, 0], rotate: [0, -3, 1, 0] },
);

export const Fuel = createCategoryIcon(
  "Fuel",
  <>
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" />
    <path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" />
    <path d="M2 21h13" />
    <path d="M3 9h11" />
  </>,
  { rotate: [0, -4, 3, 0] },
);

export const Wine = createCategoryIcon(
  "Wine",
  <>
    <path d="M8 22h8" />
    <path d="M7 10h10" />
    <path d="M12 15v7" />
    <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
  </>,
  { rotate: [0, -9, 5, 0] },
);

export const BedDouble = createCategoryIcon(
  "BedDouble",
  <>
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M12 4v6" />
    <path d="M2 18h20" />
  </>,
  { scaleY: [1, 0.94, 1.02, 1] },
);

export const Ticket = createCategoryIcon(
  "Ticket",
  <>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </>,
  { rotate: [0, -6, 4, 0], scale: [1, 1.04, 1] },
);

export const Plane = createCategoryIcon(
  "Plane",
  <>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </>,
  { x: [0, 1.5, 0], y: [0, -1.5, 0] },
);

export const Plug = createCategoryIcon(
  "Plug",
  <>
    <path d="M12 22v-5" />
    <path d="M15 8V2" />
    <path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" />
    <path d="M9 8V2" />
  </>,
  { y: [0, -1.5, 0.5, 0] },
);
