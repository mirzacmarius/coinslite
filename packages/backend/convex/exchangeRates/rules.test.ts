import { describe, expect, test } from "bun:test";
import {
  convertAt,
  convertPaid,
  daysBefore,
  exchangeRateErrors,
  isRateDay,
  paidStorable,
  ratesFinal,
  ratesFromCsv,
  samePaid,
} from "./rules";

const may10 = { NOK: 11.6915, SEK: 11.6365, USD: 1.0773, GBP: 0.86075 };

/** The ECB data portal's daily rates as `format=csvdata` gives them. */
const heading =
  "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK,OBS_COM,TIME_FORMAT,BREAKS,COLLECTION,COMPILING_ORG,DISS_ORG,DOM_SER_IDS,PUBL_ECB,PUBL_MU,PUBL_PUBLIC,UNIT_INDEX_BASE,COMPILATION,COVERAGE,DECIMALS,NAT_TITLE,SOURCE_AGENCY,SOURCE_PUB,TITLE,TITLE_COMPL,UNIT,UNIT_MULT";
const row = (currency: string, day: string, rate: string) =>
  `EXR.D.${currency}.EUR.SP00.A,D,${currency},EUR,SP00,A,${day},${rate},A,F,,,P1D,,A,,,,,,,,,,4,,4F0,,${currency}/Euro,"ECB reference exchange rate, ${currency}/Euro, 2:15 pm (C.E.T.)",${currency},0`;

describe("converting at a day's rates", () => {
  test("goes through the euro, rounded to whole minor units", () => {
    expect(convertAt(may10, 12_000, "EUR", "NOK")).toBe(140_298);
    expect(convertAt(may10, 140_298, "NOK", "EUR")).toBe(12_000);
    // 100 dollars in kroner: 100 / 1.0773 × 11.6915.
    expect(convertAt(may10, 10_000, "USD", "NOK")).toBe(108_526);
    expect(convertAt(may10, 5_000, "GBP", "GBP")).toBe(5_000);
  });

  test("needs a rate for both currencies", () => {
    expect(convertAt(may10, 10_000, "RON", "NOK")).toBeNull();
    expect(convertAt(may10, 10_000, "NOK", "RON")).toBeNull();
  });
});

describe("the days rates can be asked for", () => {
  test("run from the ECB's first rates to the latest purchase date", () => {
    expect(isRateDay("1999-01-04", "2026-10-25")).toBe(true);
    expect(isRateDay("1998-12-31", "2026-10-25")).toBe(false);
    expect(isRateDay("2026-10-25", "2026-10-25")).toBe(true);
    expect(isRateDay("2026-10-26", "2026-10-25")).toBe(false);
    expect(isRateDay("2024-02-30", "2026-10-25")).toBe(false);
    expect(isRateDay("10.05.2024", "2026-10-25")).toBe(false);
  });

  test("days back cross months and years", () => {
    expect(daysBefore("2024-05-10", 7)).toBe("2024-05-03");
    expect(daysBefore("2024-03-02", 2)).toBe("2024-02-29");
    expect(daysBefore("2025-01-03", 7)).toBe("2024-12-27");
  });

  test("a day's rates are final once its own, or once fetched after it", () => {
    const at = (time: string) => Date.parse(time);
    expect(
      ratesFinal({
        day: "2024-05-10",
        rateDay: "2024-05-10",
        fetchedAt: at("2024-05-10T15:00:00Z"),
      }),
    ).toBe(true);
    // A Saturday has Friday's rates for good.
    expect(
      ratesFinal({
        day: "2024-05-11",
        rateDay: "2024-05-10",
        fetchedAt: at("2024-05-12T08:00:00Z"),
      }),
    ).toBe(true);
    // Fetched the morning of a working day, before the ECB published its
    // rates at 16:00 CET: Thursday's, until asked for again.
    const friday = {
      day: "2026-10-23",
      rateDay: "2026-10-22",
      fetchedAt: at("2026-10-23T08:00:00Z"),
    };
    expect(ratesFinal(friday)).toBe(false);
    expect(
      ratesFinal({ ...friday, fetchedAt: at("2026-10-24T00:00:00Z") }),
    ).toBe(true);
  });
});

describe("reading the ECB's rates", () => {
  test("takes each currency's latest rate up to the day, and the day they're of", () => {
    const csv = [
      heading,
      row("NOK", "2024-05-08", "11.7203"),
      row("NOK", "2024-05-10", "11.6915"),
      row("USD", "2024-05-10", "1.0773"),
      row("RON", "2024-05-10", "4.9764"),
      // Other currencies, later days and gaps are passed over.
      row("JPY", "2024-05-10", "167.71"),
      row("SEK", "2024-05-13", "11.6400"),
      row("SEK", "2024-05-09", "11.6735"),
      row("GBP", "2024-05-10", "NaN"),
      "",
    ].join("\r\n");
    expect(ratesFromCsv(csv, "2024-05-12")).toEqual({
      rateDay: "2024-05-10",
      perEuro: { NOK: 11.6915, USD: 1.0773, RON: 4.9764, SEK: 11.6735 },
    });
  });

  test("gives nothing without a rate or the columns it reads", () => {
    expect(ratesFromCsv(heading, "2024-05-10")).toBeNull();
    expect(ratesFromCsv("", "2024-05-10")).toBeNull();
    expect(ratesFromCsv("No results found.", "2024-05-10")).toBeNull();
    expect(
      ratesFromCsv("KEY,OBS_VALUE\nEXR.D.NOK.EUR.SP00.A,11.69", "2024-05-10"),
    ).toBeNull();
  });
});

describe("a purchase in another currency", () => {
  const rates = { rateDay: "2024-05-10", perEuro: may10 };
  const paid = { amount: 12_000, currency: "EUR" as const, day: "2024-05-12" };

  test("stores the Purchase price converted, and what was paid with the rates' day", () => {
    expect(convertPaid(paid, "NOK", rates)).toEqual({
      purchasePrice: 140_298,
      purchasePaid: { amount: 12_000, currency: "EUR", rateDay: "2024-05-10" },
    });
  });

  test("paid in the Home currency, is the Purchase price itself", () => {
    expect(convertPaid(paid, "EUR", null)).toEqual({
      purchasePrice: 12_000,
      purchasePaid: undefined,
    });
  });

  test("is turned away without a rate, or with an amount that isn't one", () => {
    expect(() => convertPaid(paid, "RON", rates)).toThrow(
      exchangeRateErrors.noRate,
    );
    expect(() => convertPaid(paid, "NOK", null)).toThrow(
      exchangeRateErrors.noRate,
    );
    expect(() =>
      convertPaid({ ...paid, amount: 12.5 }, "NOK", rates),
    ).toThrow();
    expect(() => convertPaid({ ...paid, amount: -1 }, "NOK", rates)).toThrow();
  });

  test("is refused at rates newer than those the form showed", () => {
    expect(() =>
      convertPaid({ ...paid, rateDay: "2024-05-09" }, "NOK", rates),
    ).toThrow(exchangeRateErrors.rateChanged);
    expect(
      convertPaid({ ...paid, rateDay: "2024-05-10" }, "NOK", rates)
        .purchasePrice,
    ).toBe(140_298);
  });

  test("is one an Item may hold with a whole amount, at a day's rates", () => {
    const stored = {
      amount: 12_000,
      currency: "EUR" as const,
      rateDay: "2024-05-10",
    };
    expect(paidStorable(undefined, "2026-10-24")).toBe(true);
    expect(paidStorable(stored, "2026-10-24")).toBe(true);
    expect(paidStorable({ ...stored, amount: 1e300 }, "2026-10-24")).toBe(
      false,
    );
    expect(paidStorable({ ...stored, amount: 12.5 }, "2026-10-24")).toBe(false);
    expect(paidStorable({ ...stored, rateDay: "junk" }, "2026-10-24")).toBe(
      false,
    );
    expect(
      paidStorable({ ...stored, rateDay: "1998-12-31" }, "2026-10-24"),
    ).toBe(false);
  });

  test("is the stored one when the amount and currency are", () => {
    const stored = {
      amount: 12_000,
      currency: "EUR" as const,
      rateDay: "2024-05-10",
    };
    expect(samePaid(paid, stored)).toBe(true);
    expect(samePaid({ ...paid, amount: 12_001 }, stored)).toBe(false);
    expect(samePaid({ ...paid, currency: "USD" }, stored)).toBe(false);
    expect(samePaid(paid, undefined)).toBe(false);
  });
});
