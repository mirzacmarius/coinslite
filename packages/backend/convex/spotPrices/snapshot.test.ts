import { describe, expect, test } from "bun:test";
import { type StoredPrices, nextSnapshot } from "./snapshot";

const NOW = Date.parse("2026-10-15T19:05:00Z");
/** MetalpriceAPI's free plan quotes the previous day's close. */
const MONDAY_CLOSE = Date.parse("2026-10-12T23:59:59Z");
const TUESDAY_CLOSE = Date.parse("2026-10-13T23:59:59Z");
const WEDNESDAY_CLOSE = Date.parse("2026-10-14T23:59:59Z");
const EARLIER_LIVE = Date.parse("2026-10-15T18:48:00Z");
const EARLIER_RUN = Date.parse("2026-10-15T18:50:00Z");
const LIVE = Date.parse("2026-10-15T19:03:16Z");

const tuesdayCurrencies = {
  USD: 1,
  NOK: 10,
  SEK: 10.5,
  DKK: 6.9,
  EUR: 0.92,
  RON: 4.6,
  GBP: 0.79,
  CHF: 0.88,
};
const wednesdayCurrencies = {
  USD: 1,
  NOK: 10.1,
  SEK: 10.4,
  DKK: 6.8,
  EUR: 0.91,
  RON: 4.7,
  GBP: 0.78,
  CHF: 0.87,
};

/** Live metals stored 15 minutes ago, over Tuesday's exchange rates. */
const stored: StoredPrices = {
  quotedAt: EARLIER_LIVE,
  ratesQuotedAt: TUESDAY_CLOSE,
  fetchedAt: EARLIER_RUN,
  perDollar: { ...tuesdayCurrencies, XAU: 1 / 4150, XAG: 1 / 57 },
  requestsPerMonth: 100,
};

const liveMetals = {
  quotedAt: LIVE,
  perDollar: { XAU: 1 / 4160, XAG: 1 / 57.5 },
};

const wednesdayQuote = {
  quotedAt: WEDNESDAY_CLOSE,
  perDollar: { ...wednesdayCurrencies, XAU: 1 / 4100, XAG: 1 / 55 },
  requestsPerMonth: 100,
};

describe("the prices stored after a refresh", () => {
  test("take gold-api.com's metals and keep the stored exchange rates when only it was asked", () => {
    expect(nextSnapshot(stored, { metals: liveMetals }, NOW)).toEqual({
      quotedAt: LIVE,
      ratesQuotedAt: TUESDAY_CLOSE,
      fetchedAt: NOW,
      perDollar: { ...tuesdayCurrencies, XAU: 1 / 4160, XAG: 1 / 57.5 },
      requestsPerMonth: 100,
    });
  });

  test("take MetalpriceAPI's exchange rates and keep live metals quoted after its close", () => {
    expect(nextSnapshot(stored, { rates: wednesdayQuote }, NOW)).toEqual({
      quotedAt: EARLIER_LIVE,
      ratesQuotedAt: WEDNESDAY_CLOSE,
      fetchedAt: EARLIER_RUN,
      perDollar: { ...wednesdayCurrencies, XAU: 1 / 4150, XAG: 1 / 57 },
      requestsPerMonth: 100,
    });
  });

  test("take MetalpriceAPI's metals when gold-api.com didn't answer and its close is newer than the stored metals", () => {
    const storedClose = { ...stored, quotedAt: MONDAY_CLOSE };
    expect(nextSnapshot(storedClose, { rates: wednesdayQuote }, NOW)).toEqual({
      quotedAt: WEDNESDAY_CLOSE,
      ratesQuotedAt: WEDNESDAY_CLOSE,
      fetchedAt: NOW,
      perDollar: { ...wednesdayCurrencies, XAU: 1 / 4100, XAG: 1 / 55 },
      requestsPerMonth: 100,
    });
  });

  test("count as fresh when the metals were quoted as long ago as the stored ones, as over a weekend", () => {
    const unchanged = {
      quotedAt: EARLIER_LIVE,
      perDollar: { XAU: 1 / 4150, XAG: 1 / 57 },
    };
    expect(nextSnapshot(stored, { metals: unchanged }, NOW)).toEqual({
      quotedAt: EARLIER_LIVE,
      ratesQuotedAt: TUESDAY_CLOSE,
      fetchedAt: NOW,
      perDollar: { ...tuesdayCurrencies, XAU: 1 / 4150, XAG: 1 / 57 },
      requestsPerMonth: 100,
    });
  });

  test("combine both providers when nothing is stored yet", () => {
    expect(
      nextSnapshot(null, { metals: liveMetals, rates: wednesdayQuote }, NOW),
    ).toEqual({
      quotedAt: LIVE,
      ratesQuotedAt: WEDNESDAY_CLOSE,
      fetchedAt: NOW,
      perDollar: { ...wednesdayCurrencies, XAU: 1 / 4160, XAG: 1 / 57.5 },
      requestsPerMonth: 100,
    });
  });

  test("are none from metals alone when nothing is stored yet: the exchange rates are missing", () => {
    expect(nextSnapshot(null, { metals: liveMetals }, NOW)).toBeNull();
  });

  test("are none when neither provider answered, so the stored ones stay untouched", () => {
    expect(nextSnapshot(stored, {}, NOW)).toBeNull();
  });
});
