export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isTouch = () =>
  matchMedia("(hover: none), (pointer: coarse)").matches;

/**
 * The site's one easing family. A drawer comes out on its runners and stops
 * softly (`out`); the page curtain slides across and back (`inOut`); hovers
 * answer quickly (`soft`).
 */
export const ease = {
  out: "expo.out",
  inOut: "expo.inOut",
  soft: "power3.out",
} as const;
