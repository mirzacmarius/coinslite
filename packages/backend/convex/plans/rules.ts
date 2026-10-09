/** What each plan allows. Pure, so the app shares it with the backend. */

export type Plan = "free" | "premium";

/** The Free plan: at most 50 Items whatever their Quantity, with a warning from 40. */
export const freePlan = { itemLimit: 50, warnFrom: 40 } as const;

export const planErrors = {
  /** Adding (or duplicating) would take the Collection past the plan's Item limit. */
  itemLimitReached: "ITEM_LIMIT_REACHED",
  /** A Premium-only feature was asked for on the Free plan. */
  premiumRequired: "PREMIUM_REQUIRED",
} as const;
