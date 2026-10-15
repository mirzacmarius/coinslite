import { withTimeout } from "../utils/timeout";
import type { PerDollar } from "./rates";

/**
 * The live metal price provider: gold-api.com (https://gold-api.com). This is
 * the only module that knows its address and answer format. It needs no key;
 * its terms forbid several requests a second.
 */
const PRICE_URL = "https://api.gold-api.com/price";
/** How long a request may take, answer included, before it counts as failed. */
const REQUEST_TIMEOUT_MS = 15_000;

type MetalCode = "XAU" | "XAG";

/** The latest gold and silver Spot prices. */
export type MetalQuote = {
  /** When the provider quoted the older of the two, in milliseconds since the epoch. */
  quotedAt: number;
  perDollar: Pick<PerDollar, MetalCode>;
};

/**
 * Fetches gold and silver, priced per US dollar. Throws when either is
 * missing, or when the provider takes longer than REQUEST_TIMEOUT_MS to answer.
 */
export async function fetchMetals(): Promise<MetalQuote> {
  const [gold, silver] = await Promise.all([
    fetchPrice("XAU"),
    fetchPrice("XAG"),
  ]);
  return {
    quotedAt: Math.min(gold.quotedAt, silver.quotedAt),
    perDollar: { XAU: 1 / gold.price, XAG: 1 / silver.price },
  };
}

/** One metal's price in US dollars a troy ounce, and when it was quoted. */
async function fetchPrice(code: MetalCode) {
  const { response, body } = await withTimeout(
    async (signal) => {
      const response = await fetch(`${PRICE_URL}/${code}`, { signal });
      const body: unknown = await response.json().catch(() => null);
      return { response, body };
    },
    REQUEST_TIMEOUT_MS,
    `gold-api.com didn't answer within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
  );
  if (!response.ok || !isObject(body)) {
    throw new Error(`gold-api.com answered ${response.status} for ${code}`);
  }
  if (body.currency !== "USD") {
    throw new Error(
      `gold-api.com answered without a US dollar price for ${code}`,
    );
  }
  const { price, updatedAt } = body;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error(`gold-api.com answered without a price for ${code}`);
  }
  const quotedAt =
    typeof updatedAt === "string" ? Date.parse(updatedAt) : Number.NaN;
  if (Number.isNaN(quotedAt)) {
    throw new Error(`gold-api.com answered without a time for ${code}`);
  }
  return { price, quotedAt };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
