import type { HomeCurrency } from "./format";
import { type Locale, preferredTags } from "./locale";

const euroRegions = [
  "AT",
  "BE",
  "BG",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
  // Outside the EU but using the euro
  "AD",
  "ME",
  "MC",
  "SM",
  "VA",
  "XK",
];

const currencyByRegion: Record<string, HomeCurrency> = {
  ...Object.fromEntries(euroRegions.map((region) => [region, "EUR"])),
  NO: "NOK",
  SJ: "NOK",
  SE: "SEK",
  DK: "DKK",
  FO: "DKK",
  GL: "DKK",
  RO: "RON",
  GB: "GBP",
  GG: "GBP",
  IM: "GBP",
  JE: "GBP",
  US: "USD",
  PR: "USD",
  CH: "CHF",
  LI: "CHF",
};

const FALLBACK: HomeCurrency = "EUR";

function regionOf(tag: string, { guess }: { guess: boolean }) {
  try {
    const locale = new Intl.Locale(tag);
    return (guess ? locale.maximize() : locale).region;
  } catch {
    return undefined;
  }
}

/**
 * The Home currency to preselect at sign-up: the currency of a region named in
 * the browser's languages (en-GB → GBP), else of the home region of the
 * browser's first language (nb → NOK), else of the interface language's, else euro.
 */
export function suggestHomeCurrency({
  acceptLanguage,
  locale,
}: {
  acceptLanguage?: string | null;
  locale: Locale;
}): HomeCurrency {
  const tags = preferredTags(acceptLanguage ?? "");
  const region =
    tags
      .map((tag) => regionOf(tag, { guess: false }))
      .find((found) => found !== undefined) ??
    (tags[0] ? regionOf(tags[0], { guess: true }) : undefined) ??
    regionOf(locale, { guess: true });
  return (region && currencyByRegion[region]) || FALLBACK;
}
