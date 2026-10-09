/** Premium's prices and the rule for when a subscription makes someone Premium. Pure, so the app shares it. */

import type { HomeCurrency } from "@coinslite/i18n";

export const billingErrors = {
  /** This deployment has no Polar setup, so Premium isn't for sale on it. */
  unavailable: "BILLING_UNAVAILABLE",
  /** The person is on Premium already. */
  alreadyPremium: "ALREADY_PREMIUM",
  /** Polar didn't open a checkout. */
  checkoutFailed: "CHECKOUT_FAILED",
  /** The person has no subscription to manage. */
  noSubscription: "NO_SUBSCRIPTION",
  /** Polar didn't open its customer portal. */
  portalFailed: "PORTAL_FAILED",
  /** A checkout for the other billing interval is still open. */
  checkoutPending: "CHECKOUT_PENDING",
  /** The account is being deleted. */
  accountClosing: "ACCOUNT_CLOSING",
} as const;

export const billingIntervals = ["month", "year"] as const;
export type BillingInterval = (typeof billingIntervals)[number];

export const isBillingInterval = (value: unknown): value is BillingInterval =>
  (billingIntervals as readonly unknown[]).includes(value);

/**
 * Premium's prices in minor units, per billing interval. Polar charges in the
 * buyer's local currency when Premium has a price in it, otherwise in EUR.
 * `init.ts` creates the Polar products from this table.
 */
export const premiumPrices = {
  NOK: { month: 3900, year: 34900 },
  EUR: { month: 349, year: 2999 },
  USD: { month: 399, year: 3499 },
  RON: { month: 1799, year: 14999 },
} as const satisfies Partial<
  Record<HomeCurrency, Record<BillingInterval, number>>
>;

export type PremiumCurrency = keyof typeof premiumPrices;

/** What Polar charges when the buyer's local currency isn't one of Premium's. */
export const fallbackCurrency: PremiumCurrency = "EUR";

export const premiumCurrencies = Object.keys(
  premiumPrices,
) as PremiumCurrency[];

export const isPremiumCurrency = (value: unknown): value is PremiumCurrency =>
  (premiumCurrencies as unknown[]).includes(value);

/** Countries (ISO alpha-2) whose own currency Premium is priced in; everywhere else pays in EUR. */
const localCurrency: Record<string, PremiumCurrency> = {
  NO: "NOK",
  SJ: "NOK",
  BV: "NOK",
  RO: "RON",
  US: "USD",
  PR: "USD",
  GU: "USD",
  VI: "USD",
  AS: "USD",
  MP: "USD",
  UM: "USD",
};

/**
 * The currency checkout will charge in, for showing prices before it: the
 * buyer's location decides, as it does at Polar. Without a known location
 * (local development), the Home currency is the best guess.
 */
export function premiumCurrencyFor({
  country,
  homeCurrency,
}: {
  country?: string;
  homeCurrency?: string;
}): PremiumCurrency {
  if (country && /^[A-Za-z]{2}$/.test(country)) {
    return localCurrency[country.toUpperCase()] ?? fallbackCurrency;
  }
  return isPremiumCurrency(homeCurrency) ? homeCurrency : fallbackCurrency;
}

/** What the Premium status rule needs to know about a subscription. Times are ms. */
export type SubscriptionState = {
  status: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  endedAt?: number;
};

/** Statuses that are Premium within the paid period. */
const payingStatuses = new Set(["active", "trialing", "past_due"]);

/**
 * The Premium status rule: until when this subscription makes its owner
 * Premium. Active, trialing and past-due subscriptions count until their
 * period ends, when Polar's report of a renewal carries them into the next;
 * a cancelled one (or one set to cancel) until the end of the period that was
 * paid for; one that has ended (revoked), not at all.
 *
 * Returns the end in ms, "open" for Premium with no end known, or null for
 * not Premium.
 */
export function premiumUntil(
  subscription: SubscriptionState,
): number | "open" | null {
  const { status, currentPeriodEnd, endedAt } = subscription;
  let end: number | "open" | null;
  if (status === "canceled") {
    end = currentPeriodEnd ?? null;
  } else if (payingStatuses.has(status)) {
    end = currentPeriodEnd ?? "open";
  } else {
    end = null;
  }
  if (end === null || endedAt === undefined) return end;
  return end === "open" ? endedAt : Math.min(end, endedAt);
}

/** Whether Polar would charge for this subscription again, unless it's stopped. */
export const chargesAgain = (subscription: SubscriptionState) =>
  ["active", "trialing", "past_due", "unpaid"].includes(subscription.status) &&
  !subscription.cancelAtPeriodEnd &&
  subscription.endedAt === undefined;

/** Whether `premiumUntil` makes someone Premium at `now`. */
export const isPremiumAt = (until: number | "open" | null, now: number) =>
  until === "open" || (until !== null && now < until);
