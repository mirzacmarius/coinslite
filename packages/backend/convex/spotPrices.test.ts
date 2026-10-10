/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import crons from "./crons";
import schema from "./schema";
import { latestRates } from "./spotPrices";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in. */
async function person(
  t: Test,
  email: string,
  extra: { setUp?: boolean; homeCurrency?: "NOK" | "EUR" } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: extra.homeCurrency ?? "NOK",
      }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

const API_KEY = "test-key";

/**
 * What one US dollar buys: troy ounces of gold (XAU) and silver (XAG), and
 * units of each Home currency. Gold is 2400 dollars an ounce, silver 30.
 */
const market: Record<string, number> = {
  XAU: 1 / 2400,
  XAG: 1 / 30,
  NOK: 10,
  SEK: 10.5,
  DKK: 6,
  EUR: 0.8,
  RON: 4,
  GBP: 0.75,
  CHF: 0.9,
};

const quotedAt = Date.UTC(2026, 9, 9, 12, 0);

/**
 * Stands in for the price provider at its HTTP boundary. It answers like the
 * real service: only the requested currencies, prices per US dollar, an
 * error body for a wrong key and, when given, the plan's monthly quota.
 */
function fakeProvider({
  rates = market,
  timestamp = quotedAt / 1000,
  requestsPerMonth,
}: {
  rates?: Record<string, number>;
  timestamp?: number;
  requestsPerMonth?: number;
} = {}) {
  const provider = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const key = new Headers(init?.headers).get("X-API-KEY");
      if (key !== API_KEY) {
        return Response.json({
          success: false,
          error: { code: 102, info: "Invalid API key." },
        });
      }
      const wanted = url.searchParams.get("currencies")?.split(",") ?? [];
      return Response.json(
        {
          success: true,
          base: url.searchParams.get("base") ?? "USD",
          timestamp,
          rates: Object.fromEntries(
            wanted
              .filter((code) => code in rates)
              .map((code) => [code, rates[code]]),
          ),
        },
        requestsPerMonth
          ? { headers: { "x-api-quota": String(requestsPerMonth) } }
          : {},
      );
    },
  );
  vi.stubGlobal("fetch", provider);
  return provider;
}

beforeEach(() => {
  vi.stubEnv("METALPRICE_API_KEY", API_KEY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const refresh = (t: Test) => t.action(internal.spotPrices.refresh, {});

test("a refresh stores the provider's prices, shown per gram and per troy ounce in the Home currency", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  fakeProvider();

  await refresh(t);

  expect(await ada.as.query(api.spotPrices.current, {})).toEqual({
    currency: "NOK",
    quotedAt,
    stale: false,
    // 2400 dollars at 10 kroner = 24 000 kr an ounce, 771.62 kr a gram.
    gold: { perGram: 77162, perOunce: 2400000 },
    // 30 dollars at 10 kroner = 300 kr an ounce, 9.65 kr a gram.
    silver: { perGram: 965, perOunce: 30000 },
  });
});

test("everyone sees the same snapshot in their own Home currency, from one provider request", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  const bea = await person(t, "bea@example.com", { homeCurrency: "EUR" });
  await person(t, "cy@example.com", { homeCurrency: "EUR" });
  const provider = fakeProvider();

  await refresh(t);

  expect(provider).toHaveBeenCalledTimes(1);
  expect((await ada.as.query(api.spotPrices.current, {}))?.gold.perOunce).toBe(
    2400000,
  );
  expect(await bea.as.query(api.spotPrices.current, {})).toMatchObject({
    currency: "EUR",
    // 2400 dollars at 0.80 euro = 1920 € an ounce, 61.73 € a gram.
    gold: { perGram: 6173, perOunce: 192000 },
    // 30 dollars at 0.80 euro = 24 € an ounce, 0.77 € a gram.
    silver: { perGram: 77, perOunce: 2400 },
  });
});

test("before the first refresh there are no Spot prices to show", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  expect(await ada.as.query(api.spotPrices.current, {})).toBeNull();
});

test("Spot prices are for signed-in people who have finished signing up", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });
  fakeProvider();
  await refresh(t);

  await expect(t.query(api.spotPrices.current, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(newcomer.as.query(api.spotPrices.current, {})).rejects.toThrow(
    "NOT_SET_UP",
  );
});

const failures = {
  "is unreachable": async () => {
    throw new TypeError("fetch failed");
  },
  "has a server error": async () =>
    new Response("Bad gateway", { status: 502 }),
  "refuses the request": async () =>
    Response.json({
      success: false,
      error: { code: 105, info: "Monthly request allowance reached." },
    }),
  "leaves a currency out": async () =>
    Response.json({
      success: true,
      base: "USD",
      timestamp: quotedAt / 1000 + 900,
      rates: { ...market, RON: undefined },
    }),
  "answers with a price that isn't positive": async () =>
    Response.json({
      success: true,
      base: "USD",
      timestamp: quotedAt / 1000 + 900,
      rates: { ...market, XAG: 0 },
    }),
};

test.each(Object.entries(failures))(
  "when the provider %s, the last good snapshot is kept and the failure is logged",
  async (_, failure) => {
    const t = newTest();
    const ada = await person(t, "ada@example.com");
    fakeProvider();
    await refresh(t);
    const before = await ada.as.query(api.spotPrices.current, {});
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", vi.fn(failure));
    await refresh(t);

    expect(await ada.as.query(api.spotPrices.current, {})).toEqual(before);
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining("Spot prices not refreshed"),
      expect.anything(),
    );
  },
);

test("a failure before the first good refresh leaves nothing to show", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(failures["refuses the request"]));

  await refresh(t);

  expect(await ada.as.query(api.spotPrices.current, {})).toBeNull();
});

test("without an API key nothing is requested, a warning is logged and the last prices stay", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const provider = fakeProvider();
  await refresh(t);
  const before = await ada.as.query(api.spotPrices.current, {});
  const warned = vi.spyOn(console, "warn").mockImplementation(() => {});

  vi.stubEnv("METALPRICE_API_KEY", undefined);
  await refresh(t);

  expect(provider).toHaveBeenCalledTimes(1);
  expect(warned).toHaveBeenCalledWith(
    expect.stringContaining("METALPRICE_API_KEY"),
  );
  expect(await ada.as.query(api.spotPrices.current, {})).toEqual(before);
});

test("a wrong API key is a failed refresh", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  fakeProvider();
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("METALPRICE_API_KEY", "not-the-key");

  await refresh(t);

  expect(logged).toHaveBeenCalled();
  expect(await ada.as.query(api.spotPrices.current, {})).toBeNull();
});

const MINUTE = 60 * 1000;

test("prices go out of date after an hour of failed refreshes, and are current again after a good one", async () => {
  vi.useFakeTimers({ now: quotedAt + MINUTE });
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const current = () => ada.as.query(api.spotPrices.current, {});
  fakeProvider();
  await refresh(t);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(failures["has a server error"]));

  // Four failed refreshes, 15 minutes apart: exactly an hour.
  for (let run = 0; run < 4; run++) {
    vi.advanceTimersByTime(15 * MINUTE);
    await refresh(t);
  }
  expect(await current()).toMatchObject({ stale: false, quotedAt });

  vi.advanceTimersByTime(15 * MINUTE);
  await refresh(t);
  expect(await current()).toMatchObject({
    stale: true,
    quotedAt,
    gold: { perOunce: 2400000 },
  });

  const later = quotedAt + 90 * MINUTE;
  fakeProvider({
    rates: { ...market, XAU: 1 / 2500 },
    timestamp: later / 1000,
  });
  vi.advanceTimersByTime(15 * MINUTE);
  await refresh(t);
  expect(await current()).toMatchObject({
    stale: false,
    quotedAt: later,
    gold: { perOunce: 2500000 },
  });
});

test("conversions for other features use the stored snapshot", async () => {
  const t = newTest();
  expect(await t.run((ctx) => latestRates(ctx))).toBeNull();
  fakeProvider();
  await refresh(t);

  const rates = await t.run(async (ctx) => {
    const rates = await latestRates(ctx);
    return (
      rates && {
        quotedAt: rates.quotedAt,
        eurToNok: rates.rate("EUR", "NOK"),
        thousandEurosInNok: rates.convert(100000, "EUR", "NOK"),
        // 12.34 kr at 0.08 € = 0.9872 €, rounded to whole cents.
        someKronerInEur: rates.convert(1234, "NOK", "EUR"),
        sameCurrency: rates.convert(1234, "NOK", "NOK"),
        goldGramInEur: rates.spotPricePerGram("gold", "EUR"),
        silverGramInUsd: rates.spotPricePerGram("silver", "USD"),
      }
    );
  });

  expect(rates).toEqual({
    quotedAt,
    eurToNok: 12.5,
    thousandEurosInNok: 1250000,
    someKronerInEur: 99,
    sameCurrency: 1234,
    // In cents and not rounded: 1920 € / 31.1034768 g, 30 $ / 31.1034768 g.
    goldGramInEur: expect.closeTo(6172.94334, 4),
    silverGramInUsd: expect.closeTo(96.45224, 4),
  });
});

test("a plan's monthly request quota spaces the requests so it lasts a month, with a tenth to spare", async () => {
  vi.useFakeTimers({ now: quotedAt + MINUTE });
  const t = newTest();
  // 100 requests a month: one every 31 days / 90, about 8 hours 16 minutes.
  const provider = fakeProvider({ requestsPerMonth: 100 });
  await refresh(t);
  expect(provider).toHaveBeenCalledTimes(1);

  for (let run = 1; run <= 32; run++) {
    vi.advanceTimersByTime(15 * MINUTE);
    await refresh(t);
  }
  // 8 hours on: still the one request.
  expect(provider).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(15 * MINUTE);
  await refresh(t);
  expect(provider).toHaveBeenCalledTimes(2);
});

test("on a plan with room for it, every scheduled refresh asks the provider", async () => {
  vi.useFakeTimers({ now: quotedAt + MINUTE });
  const t = newTest();
  const provider = fakeProvider({ requestsPerMonth: 10_000 });
  for (let run = 0; run < 3; run++) {
    await refresh(t);
    vi.advanceTimersByTime(15 * MINUTE);
  }
  expect(provider).toHaveBeenCalledTimes(3);
});

test("the refresh is scheduled every 15 minutes", () => {
  expect(Object.values(crons.crons)).toContainEqual({
    name: "spotPrices:refresh",
    args: [{}],
    schedule: { type: "interval", minutes: 15 },
  });
});
