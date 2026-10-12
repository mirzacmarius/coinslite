/**
 * How the bundled datasets from the European Central Bank credit it. The ECB
 * lets anyone reuse its website's information with the ECB cited as the
 * source; where it is part of something sold, buyers must be told it is free
 * of charge from the ECB, and any change must be stated. Each credit says all
 * three. EU law and the Official Journal may be reused with the source
 * acknowledged (Commission Decision 2011/833/EU).
 */

export const ecbPages = "https://www.ecb.europa.eu/euro/coins";
const changes =
  "Changes by CoinsLite: arranged into Catalog fields; capitals and typography tidied.";

export type Provenance = {
  source: string;
  author: string;
  licence: string;
  link: string;
};

export const ecb = (link: string): Provenance => ({
  source: "European Central Bank",
  author: "European Central Bank",
  licence: `Reused under the ECB's copyright terms, citing the ECB. Available free of charge at www.ecb.europa.eu. ${changes}`,
  link,
});

export const officialJournal = (notice: string, link: string): Provenance => ({
  source: `Official Journal of the European Union, notice ${notice}`,
  author: "European Commission",
  licence: `© European Union. Reuse allowed with the source acknowledged (Commission Decision 2011/833/EU). ${changes}`,
  link,
});

/**
 * The ECB and an EU regulation together, for facts that come from both; the
 * two licences shortened to fit one credit. The link is the ECB's page.
 */
export const ecbAndRegulation = (
  regulation: string,
  link: string,
): Provenance => ({
  source: `European Central Bank; Council Regulation ${regulation}`,
  author: "European Central Bank; Council of the European Union",
  licence:
    "ECB terms, citing the ECB, free of charge at www.ecb.europa.eu. Regulation: © European Union, reused with the source acknowledged (Decision 2011/833/EU). Arranged into Catalog fields.",
  link,
});

/**
 * Decision ECB/2013/10 on euro banknotes, consolidated with its amendments
 * on EUR-Lex, as the ECB's page on banknote images links it.
 */
export const banknoteDecision =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02013D0010-20210104";

/**
 * The ECB and its Decision ECB/2013/10 together, for what comes from both;
 * the two licences shortened to fit one credit. The link is the Decision,
 * or the ECB's page where that says more.
 */
export const ecbAndDecision = (link = banknoteDecision): Provenance => ({
  source: "European Central Bank; Decision ECB/2013/10",
  author: "European Central Bank",
  licence:
    "ECB terms, citing the ECB, free of charge at www.ecb.europa.eu. Decision: © European Union, reused with the source acknowledged (EUR-Lex). Arranged into Catalog fields.",
  link,
});

/** Facts or notes credited: facts_source, facts_author… */
export const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

/** The app's languages besides English that the ECB publishes its pages in. */
export const ecbTranslations = ["de", "fr", "ro"] as const;
export type EcbTranslation = (typeof ecbTranslations)[number];

/** French sets a colon apart. */
export const colon = (language: string) =>
  language === "fr" ? "\u00a0: " : ": ";

/** Notes in one of those languages, credited to the ECB's page in it. */
export const translated = (
  language: EcbTranslation,
  notes: { technical_details?: string; historical_notes?: string },
  link: string,
) => {
  const from = ecb(link);
  return {
    ...(notes.technical_details && {
      [`technical_details_${language}`]: notes.technical_details,
    }),
    ...(notes.historical_notes && {
      [`historical_notes_${language}`]: notes.historical_notes,
    }),
    [`notes_source_${language}`]: from.source,
    [`notes_author_${language}`]: from.author,
    [`notes_licence_${language}`]: from.licence,
    [`notes_link_${language}`]: from.link,
  };
};
