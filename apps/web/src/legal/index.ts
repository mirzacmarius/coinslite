import type { Locale } from "@coinslite/i18n";
import privacyDe from "./privacy/de";
import privacyEn from "./privacy/en";
import privacyFr from "./privacy/fr";
import privacyNb from "./privacy/nb";
import privacyRo from "./privacy/ro";
import termsDe from "./terms/de";
import termsEn from "./terms/en";
import termsFr from "./terms/fr";
import termsNb from "./terms/nb";
import termsRo from "./terms/ro";
import type { LegalText } from "./types";

export type LegalDocument = "privacy" | "terms";

/** When the texts last changed; update it with every change to them. */
export const lastUpdated = "2026-10-10";

/** Each text in each language. The English one governs if they differ. */
export const legalTexts = {
  privacy: {
    en: privacyEn,
    nb: privacyNb,
    de: privacyDe,
    fr: privacyFr,
    ro: privacyRo,
  },
  terms: { en: termsEn, nb: termsNb, de: termsDe, fr: termsFr, ro: termsRo },
} satisfies Record<LegalDocument, Record<Locale, LegalText>>;
