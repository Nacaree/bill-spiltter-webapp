export const motionTiming = {
  fast: 0.12,
  standard: 0.2,
  reveal: 0.24,
  exit: 0.14,
  ease: [0.22, 1, 0.36, 1],
};

export function motionTransition(
  reducedMotion,
  duration = motionTiming.standard,
) {
  return { duration: reducedMotion ? 0 : duration, ease: motionTiming.ease };
}
