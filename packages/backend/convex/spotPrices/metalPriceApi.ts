import { withTimeout } from "../utils/timeout";
import { type PerDollar, rateCodes } from "./rates";

/**
 * The exchange-rate provider, whose gold and silver are the backup for
 * gold-api.com's: MetalpriceAPI (https://metalpriceapi.com). This is the only
 * module that knows its address and answer format.
 */
const LATEST_URL = "https://api.metalpriceapi.com/v1/latest";
/** How long a request may take, answer included, before it counts as failed. */
const REQUEST_TIMEOUT_MS = 15_000;

/** The latest prices from the provider. */
export type Quote = {
  /** When the provider quoted them, in milliseconds since the epoch. */
  quotedAt: number;
  perDollar: PerDollar;
  /** How many requests the plan allows a month, when the provider says. */
  requestsPerMonth?: number;
};

/**
 * Fetches gold, silver and the Home currencies, priced per US dollar. Throws
 * when anything is missing, or when the provider takes longer than
 * REQUEST_TIMEOUT_MS to answer.
 */
export async function fetchQuote(apiKey: string): Promise<Quote> {
  const currencies = rateCodes.filter((code) => code !== "USD");
  const url = `${LATEST_URL}?base=USD&currencies=${currencies.join(",")}`;
  const { response, body } = await withTimeout(
    async (signal) => {
      const response = await fetch(url, {
        headers: { "X-API-KEY": apiKey },
        signal,
      });
      const body: unknown = await response.json().catch(() => null);
      return { response, body };
    },
    REQUEST_TIMEOUT_MS,
    `MetalpriceAPI didn't answer within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
  );
  if (!response.ok || !isObject(body) || body.success !== true) {
    const error = isObject(body) && isObject(body.error) ? body.error : {};
    throw new Error(
      `MetalpriceAPI answered ${response.status}: ${String(error.info ?? error.message ?? "no prices")}`,
    );
  }
  if (body.base !== "USD" || typeof body.timestamp !== "number") {
    throw new Error(
      "MetalpriceAPI answered without a US dollar base or a time",
    );
  }
  const rates = isObject(body.rates) ? body.rates : {};
  const perDollar = { USD: 1 } as PerDollar;
  for (const code of currencies) {
    const rate = rates[code];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`MetalpriceAPI answered without a price for ${code}`);
    }
    perDollar[code] = rate;
  }
  const quota = Number(response.headers.get("x-api-quota"));
  return {
    quotedAt: body.timestamp * 1000,
    perDollar,
    ...(Number.isSafeInteger(quota) &&
      quota > 0 && { requestsPerMonth: quota }),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
