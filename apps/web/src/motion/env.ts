/**
 * No motion: the visitor asked for none, or the page had to show itself
 * before the scripts booted (`.still`, set by the layout's flags script).
 */
export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.classList.contains("still");
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
