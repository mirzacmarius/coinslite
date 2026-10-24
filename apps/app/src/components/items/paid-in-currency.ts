"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type DayRates,
  type PaidInput,
  convertAt,
  exchangeRateErrors,
  firstRateDay,
  isRateDay,
  samePaid,
} from "@coinslite/backend/convex/exchangeRates/rules";
import {
  type HomeCurrency,
  type Locale,
  homeCurrencies,
  parseMoney,
} from "@coinslite/i18n";
import type { CurrencyPicker } from "@coinslite/ui/money-input";
import { useAction } from "convex/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { paidDay } from "./item-form-submit";

/**
 * A purchase in another currency (spec §4): the Purchase price typed in the
 * currency it was paid in, converted into the Home currency at the European
 * Central Bank's rates of the purchase date, or of today without one.
 */

/** The latest day rates are asked for: tomorrow, as the server allows. */
const latestDay = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** A day's rates as the app has them so far. */
export type RatesState =
  | { state: "loading" }
  | { state: "ready"; rates: DayRates }
  /** The ECB has no rates for the day (before 1999, or not a day). */
  | { state: "none" }
  | { state: "failed" };

/**
 * The days' rates as the app has them, shared by the forms open, so that a
 * Purchase price's hint and its save go by the same rates: saving asks for
 * the day's again first (`usePaidCheck`), and the hint shows what it got.
 */
const knownRates = new Map<string, RatesState>();
const rateListeners = new Set<() => void>();

function setKnownRates(day: string, state: RatesState | undefined) {
  if (state) knownRates.set(day, state);
  else knownRates.delete(day);
  for (const listener of rateListeners) listener();
}

/** Forgets the days' rates, for the hints to ask for them again. */
function forgetRates() {
  knownRates.clear();
  for (const listener of rateListeners) listener();
}

const subscribeRates = (listener: () => void) => {
  rateListeners.add(listener);
  return () => {
    rateListeners.delete(listener);
  };
};

/**
 * The ECB rates of `day`, asked for once the person has stopped typing for a
 * moment (exchangeRates.ofDay); undefined when no day is asked about. A
 * failure is this form's own: another one asks again.
 */
export function useDayRates(day: string | undefined) {
  const ofDay = useAction(api.exchangeRates.ofDay);
  const asked = day !== undefined && isRateDay(day, latestDay());
  const known = useSyncExternalStore(
    subscribeRates,
    () => (asked ? knownRates.get(day) : undefined),
    () => undefined,
  );
  const [failedDay, setFailedDay] = useState<string>();
  useEffect(() => {
    if (!asked || known !== undefined || failedDay === day) return;
    const timer = setTimeout(() => {
      setKnownRates(day, { state: "loading" });
      ofDay({ day })
        .then((rates) =>
          setKnownRates(
            day,
            rates ? { state: "ready", rates } : { state: "none" },
          ),
        )
        .catch(() => {
          setKnownRates(day, undefined);
          setFailedDay(day);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [asked, day, known, failedDay, ofDay]);
  if (day === undefined) return undefined;
  if (!asked) return { state: "none" } as const;
  if (known) return known;
  return failedDay === day
    ? ({ state: "failed" } as const)
    : ({ state: "loading" } as const);
}

/** An edited Item's purchase as stored. */
export type StoredPurchase = Pick<
  Doc<"items">,
  "purchasePrice" | "purchasePaid" | "purchaseDate"
>;

/** The Home currencies offered for a purchase, the Home currency first. */
export function paidCurrencies(home: HomeCurrency) {
  return [home, ...homeCurrencies.filter((code) => code !== home)];
}

/** The currency menu inside a Purchase price field. */
export function usePaidPicker(
  home: HomeCurrency,
  onChange: (currency: HomeCurrency | undefined) => void,
): CurrencyPicker {
  const t = useI18n();
  return {
    currencies: paidCurrencies(home),
    label: t("items.paidIn"),
    onChange: (code) =>
      onChange(code === home ? undefined : (code as HomeCurrency)),
  };
}

/**
 * What a Purchase price field says while its amount is typed in another
 * currency: as its hint, the amount in the Home currency at the rates of the
 * purchase date (or that they're being fetched); as a `problem`, why it
 * can't be converted. Nothing in the Home currency. An edited Item's
 * purchase left as it is (`stored`) isn't converted again: its hint is the
 * Purchase price it was converted to, at the rates it was.
 */
export function usePaidHint({
  amountText,
  currency,
  home,
  purchaseDate,
  locale,
  stored,
}: {
  amountText: string;
  currency: HomeCurrency | undefined;
  home: HomeCurrency | undefined;
  purchaseDate: string;
  locale: Locale;
  stored?: StoredPurchase;
}): { hint?: string; problem?: string } {
  const t = useI18n();
  const format = useFormatters();
  const other =
    currency !== undefined && home !== undefined && currency !== home;
  const amount = amountText.trim() ? parseMoney(amountText, locale) : null;
  const kept =
    other &&
    amount !== null &&
    stored?.purchasePrice !== undefined &&
    stored.purchasePaid !== undefined &&
    samePaid({ amount, currency }, stored.purchasePaid) &&
    (purchaseDate.trim() || undefined) === stored.purchaseDate
      ? { price: stored.purchasePrice, rateDay: stored.purchasePaid.rateDay }
      : undefined;
  const day = paidDay(purchaseDate);
  const rates = useDayRates(other && !kept ? day : undefined);
  // Beside an amount in another krone, the Home currency's shows its code.
  const inHome = (amount: number) =>
    format.money(amount, home ?? "EUR", { besides: currency });
  if (kept)
    return {
      // Without the rates' day once a Home currency change converted it.
      hint: kept.rateDay
        ? t("items.paidRate", {
            amount: inHome(kept.price),
            date: format.date(kept.rateDay),
          })
        : inHome(kept.price),
    };
  if (!other || !rates) return {};
  if (rates.state === "loading") return { hint: t("items.paidLoading") };
  if (rates.state === "failed")
    return { problem: t("items.paidFailed", { currency: home }) };
  if (rates.state === "none") {
    if (day < firstRateDay)
      return { problem: t("items.paidTooEarly", { currency: home }) };
    // A date to come is the purchase date's own rule to refuse.
    if (!isRateDay(day, latestDay())) return {};
    return {
      problem: t("items.paidNoRate", {
        date: format.date(day),
        currency: home,
      }),
    };
  }
  const { perEuro, rateDay } = rates.rates;
  const date = format.date(rateDay);
  // A currency the ECB didn't quote then, such as the leu before July 2005.
  if (convertAt(perEuro, 100, currency, home) === null)
    return { problem: t("items.paidNoRate", { date, currency: home }) };
  const converted =
    amount === null ? null : convertAt(perEuro, amount, currency, home);
  return {
    hint:
      converted === null
        ? t("items.paidRateOnly", { date })
        : t("items.paidRate", { amount: inHome(converted), date }),
  };
}

/**
 * Before saving a purchase in another currency: asks for the day's rates
 * again, so the server keeps those it converts at, and gives their day
 * (`rateDay`), for the save to be converted at them; says why it can't be
 * saved otherwise (`problem`): no rates for the day, none to be had now, or
 * the ECB has published the day's own since the hint showed the amount at
 * the last working day's, when the hint shows the new amount.
 */
export function usePaidCheck() {
  const t = useI18n();
  const format = useFormatters();
  const ofDay = useAction(api.exchangeRates.ofDay);
  return async (
    paid: PaidInput | undefined,
    home: HomeCurrency | undefined,
  ): Promise<{ problem?: string; rateDay?: string }> => {
    if (!paid || !home || paid.currency === home) return {};
    if (paid.day < firstRateDay)
      return { problem: t("items.paidTooEarly", { currency: home }) };
    // A date to come is the purchase date's own rule to refuse.
    if (!isRateDay(paid.day, latestDay())) return {};
    let rates: DayRates | null;
    try {
      rates = await ofDay({ day: paid.day });
    } catch {
      return { problem: t("items.paidFailed", { currency: home }) };
    }
    const shown = knownRates.get(paid.day);
    setKnownRates(
      paid.day,
      rates ? { state: "ready", rates } : { state: "none" },
    );
    if (
      !rates ||
      convertAt(rates.perEuro, paid.amount, paid.currency, home) === null
    )
      return {
        problem: t("items.paidNoRate", {
          date: format.date(rates?.rateDay ?? paid.day),
          currency: home,
        }),
      };
    if (shown?.state === "ready" && shown.rates.rateDay !== rates.rateDay)
      return { problem: t("items.paidRateChanged") };
    return { rateDay: rates.rateDay };
  };
}

/** What a failed save says when the purchase in another currency was the trouble; undefined otherwise. */
export function usePaidFailure() {
  const t = useI18n();
  return (code: unknown, home: HomeCurrency | undefined) => {
    if (!home) return undefined;
    if (code === exchangeRateErrors.rateChanged) {
      // Published since the check: the hints ask again, for the new amount.
      forgetRates();
      return t("items.paidRateChanged");
    }
    if (code === exchangeRateErrors.unavailable)
      return t("items.paidFailed", { currency: home });
    if (
      code === exchangeRateErrors.noRate ||
      code === exchangeRateErrors.invalidDay
    )
      return t("items.paidNone", { currency: home });
    return undefined;
  };
}
