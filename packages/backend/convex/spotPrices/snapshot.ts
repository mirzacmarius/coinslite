import type { MetalQuote } from "./goldApi";
import type { Quote } from "./metalPriceApi";
import type { PerDollar } from "./rates";

/** The stored prices (spotPriceSnapshots), as a refresh replaces them. */
export type StoredPrices = {
  quotedAt: number;
  ratesQuotedAt: number;
  fetchedAt: number;
  perDollar: PerDollar;
  requestsPerMonth?: number;
};

/**
 * The prices to store after a refresh at `now`, or null when there's nothing
 * to store. The exchange rates come from MetalpriceAPI when it was asked; the
 * metals are the most recently quoted of the stored ones, gold-api.com's and
 * MetalpriceAPI's. `fetchedAt` moves only when this refresh brought the
 * metals, so the prices go out of date when live ones stop arriving, however
 * often the exchange rates change.
 */
export function nextSnapshot(
  stored: StoredPrices | null,
  { metals, rates }: { metals?: MetalQuote; rates?: Quote },
  now: number,
): StoredPrices | null {
  const currencies = rates
    ? {
        perDollar: rates.perDollar,
        ratesQuotedAt: rates.quotedAt,
        requestsPerMonth: rates.requestsPerMonth,
      }
    : stored;
  const fetched: MetalQuote | undefined =
    !rates || (metals && metals.quotedAt >= rates.quotedAt) ? metals : rates;
  if (!currencies || !fetched) return null;
  // A fetched quote as old as the stored one still counts as fresh: over a
  // weekend the market doesn't move.
  const kept = stored && stored.quotedAt > fetched.quotedAt ? stored : null;
  const { XAU, XAG } = (kept ?? fetched).perDollar;
  return {
    quotedAt: (kept ?? fetched).quotedAt,
    ratesQuotedAt: currencies.ratesQuotedAt,
    fetchedAt: kept ? kept.fetchedAt : now,
    perDollar: { ...currencies.perDollar, XAU, XAG },
    ...(currencies.requestsPerMonth !== undefined && {
      requestsPerMonth: currencies.requestsPerMonth,
    }),
  };
}
