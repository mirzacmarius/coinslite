import { type PerDollar, rateCodes } from "./rates";

/**
 * The price provider: MetalpriceAPI (https://metalpriceapi.com). This is the
 * only module that knows its address and answer format, so another provider
 * replaces just this file.
 */
const LATEST_URL = "https://api.metalpriceapi.com/v1/latest";

/** The latest prices from the provider. */
export type Quote = {
  /** When the provider quoted them, in milliseconds since the epoch. */
  quotedAt: number;
  perDollar: PerDollar;
};

/** Fetches gold, silver and the Home currencies, priced per US dollar. Throws when anything is missing. */
export async function fetchQuote(apiKey: string): Promise<Quote> {
  const currencies = rateCodes.filter((code) => code !== "USD");
  const url = `${LATEST_URL}?base=USD&currencies=${currencies.join(",")}`;
  const response = await fetch(url, { headers: { "X-API-KEY": apiKey } });
  const body: unknown = await response.json().catch(() => null);
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
  return { quotedAt: body.timestamp * 1000, perDollar };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
