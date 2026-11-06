export const motionTiming = {
  fast: 0.12,
  standard: 0.2,
  reveal: 0.24,
  exit: 0.14,
  ease: [0.22, 1, 0.36, 1],
};

export const balanceChangeTiming = {
  duration: 1100,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const navigationIconTiming = {
  duration: 0.6,
  receiptLineDuration: 0.55,
  receiptLift: 1.5,
  ease: [0.4, 0, 0.2, 1],
};

export const receiptSpotlightTiming = {
  duration: 4500,
  floatDuration: 2400,
  lift: 7,
  scanStart: 0.1,
  scanEnd: 0.26,
  easing: "ease-in-out",
};

export const drawerChevronTiming = {
  duration: 420,
  distance: 3,
  easing: "ease-in-out",
};

export const searchTraceTiming = {
  circle: 0.28,
  handle: 0.12,
};

export const mobileSearchTiming = {
  ripple: 480,
  press: 100,
  release: 280,
};

export const searchClearTiming = {
  enter: 0.16,
  exit: 0.22,
  erase: 180,
  twistSpeed: 2.5,
};

export const expenseFilterTiming = {
  duration: 240,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const expenseFilterSpring = {
  type: "spring",
  stiffness: 420,
  damping: 24,
  mass: 0.8,
};

export const addExpenseStrokeTiming = {
  duration: 8000,
};

export function motionTransition(
  reducedMotion,
  duration = motionTiming.standard,
) {
  return { duration: reducedMotion ? 0 : duration, ease: motionTiming.ease };
}
