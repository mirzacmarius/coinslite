/**
 * The Wantlist's limits and errors. Pure, so the app words the same limits
 * the backend enforces.
 */

export const wantLimits = {
  /** Catalog entries one person may want at once. */
  wants: 1000,
} as const;

export const wantErrors = {
  /** Wanting more would pass `wantLimits.wants`. */
  tooManyWants: "TOO_MANY_WANTS",
} as const;
