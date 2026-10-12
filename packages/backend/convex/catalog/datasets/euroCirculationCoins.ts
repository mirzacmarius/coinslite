import { formatCsvRecord } from "../csvText";
import { type CoinEdge, catalogCsvColumns } from "../fields";
import {
  type EcbTranslation,
  colon,
  credit,
  ecb,
  ecbAndRegulation,
  ecbPages,
  ecbTranslations,
  translated,
} from "./ecbCredit";
import {
  type EuroCoinFact,
  type EuroCoinSeries,
  euroCoinIssuers,
  euroCoinSpecifications,
  euroNationalSides,
  nordicGold,
} from "./euroCoinSides";
import { de, deSpecifications } from "./euroCoinSidesDe";
import { fr, frSpecifications } from "./euroCoinSidesFr";
import { ro, roSpecifications } from "./euroCoinSidesRo";

/**
 * The euro circulation coins, 1 cent to 2 euro, of every issuer, as a Catalog
 * CSV file: one country root per issuer, then each denomination, then each
 * design series the ECB shows (Belgium's three, the Vatican's five), with one
 * entry per coin type.
 *
 * Facts and notes: the European Central Bank's pages on the national sides
 * of each denomination, its page on the common sides (sizes, weights,
 * composition and edge) and its page on joining the euro area, rebuilt into
 * euroCoinSides.ts by scripts/fetch-euro-circulation-coins.ts, under the ECB's
 * terms (ecbCredit.ts). The ECB's design text is each entry's technical
 * details, in English and in German, French and Romanian, credited to the
 * page in each language; each denomination's shape, colour, composition and
 * edge, in the ECB's words, are its grouping's. Nordic gold's alloy comes
 * from Council Regulation (EU) No 729/2014, which recast Regulation (EC) No
 * 975/98; the 10, 20 and 50-cent entries credit it beside the ECB.
 *
 * Years: a member's first series begins the year it introduced euro cash
 * (2002 for the twelve founders, though some struck coins dated 1999–2001);
 * later series begin, and the Vatican's end, in the years the ECB gives, and
 * otherwise a replaced series ends the year before the next began. Designers
 * and the 2-euro edge lettering are taken from the ECB's text where it gives
 * them. Nothing the ECB doesn't give is filled in: no mintages, and no years
 * for Andorra or San Marino.
 *
 * No images: the national sides' designs belong to each issuing country, and
 * the ECB's terms don't cover showing them, so entries show the placeholder.
 */

type Row = Record<string, string>;

const sidesPage = (denomination: string, language: string) =>
  `${ecbPages}/${denomination}/html/index.${language}.html`;
const commonPage = (language: string) =>
  `${ecbPages}/common/html/index.${language}.html`;

/** The ECB's pages name the denominations without spaces, the cent pages in the plural. */
const pageName = (denomination: string) =>
  denomination === "1 cent"
    ? "1cent"
    : denomination.replace(" ", "").replace(/cent$/, "cents");

/** The ECB's words for each composition and edge, as Catalog materials and edges. */
const materialOf = (composition: string) => {
  if (composition === "Nordic gold") return "aluminiumBronze";
  if (composition === "Copper-covered steel") return "steel";
  if (/^Outer part: .+; inner part: .+/.test(composition)) return "bimetallic";
  throw new Error(`Unknown euro coin composition ${composition}`);
};
/** A groove or scallops have no Catalog edge of their own, so the edge stays empty. */
const edges: Record<string, CoinEdge | ""> = {
  "Edge lettering, fine milled": "lettered",
  "Interrupted milled": "interruptedReeding",
  Plain: "plain",
  Smooth: "plain",
  "Smooth with a groove": "",
  "Shaped edge with fine scallops": "",
};

/** The common side's fact with this label on the ECB's English page. */
const factOf = (facts: EuroCoinFact[], label: string) => {
  const fact = facts.find((one) => one.label === label);
  if (!fact) throw new Error(`No ${label} in ${JSON.stringify(facts)}`);
  return fact.value;
};
/** Diameter, thickness and weight come first on the common sides page in every language; they have fields of their own. */
const measuredFacts = 3;

/** "Shape: Round. Colour: Gold. …": the common side's words that have no field, in one language. */
const specificationWords = (facts: EuroCoinFact[], language: string) =>
  facts
    .slice(measuredFacts)
    .map(
      ({ label, value }) =>
        `${label}${colon(language)}${value.replace(/\.$/, "")}.`,
    )
    .join(" ");

/** What every coin of a denomination shares: its common side's facts. */
function denominationFacts(denomination: string) {
  const facts = euroCoinSpecifications[denomination];
  if (!facts) throw new Error(`No specification for ${denomination}`);
  const composition = factOf(facts, "Composition");
  const edge = edges[factOf(facts, "Edge")];
  if (edge === undefined)
    throw new Error(`Unknown euro coin edge ${factOf(facts, "Edge")}`);
  return {
    material: materialOf(composition),
    weight_g: String(Number(factOf(facts, "Weight (g)"))),
    diameter_mm: String(Number(factOf(facts, "Diameter (mm)"))),
    thickness_mm: String(Number(factOf(facts, "Thickness (mm)"))),
    edge,
    ...(composition === "Nordic gold" && {
      composition: Object.entries(nordicGold)
        .map(([metal, percent]) => `${metal} ${percent}%`)
        .join("; "),
    }),
  };
}

/** The ECB's pages in the app's other languages: the national sides' texts and the common sides' words. */
const translations: Record<
  EcbTranslation,
  {
    sides: Record<string, string>;
    specifications: Record<string, EuroCoinFact[]>;
  }
> = {
  de: { sides: de, specifications: deSpecifications },
  fr: { sides: fr, specifications: frSpecifications },
  ro: { sides: ro, specifications: roSpecifications },
};

/** Technical details in each language the ECB has them in, each credited to its page. */
const translatedDetails = (
  detailsIn: (language: EcbTranslation) => string | undefined,
  pageIn: (language: EcbTranslation) => string,
): Row =>
  Object.assign(
    {},
    ...ecbTranslations.flatMap((language) => {
      const details = detailsIn(language);
      return details
        ? [
            translated(
              language,
              { technical_details: details },
              pageIn(language),
            ),
          ]
        : [];
    }),
  );

const seriesYears = ({ yearFrom, yearTo }: EuroCoinSeries) => ({
  year_from: yearFrom === undefined ? "" : String(yearFrom),
  year_to: yearTo === undefined ? "" : String(yearTo),
});

/** The years a denomination's series span, open while one is still issued. */
const spanOf = (series: EuroCoinSeries[]) => {
  const from = series.flatMap(({ yearFrom }) =>
    yearFrom === undefined ? [] : [yearFrom],
  );
  const open = series.some(({ yearTo }) => yearTo === undefined);
  return seriesYears({
    title: "",
    yearFrom: from.length > 0 ? Math.min(...from) : undefined,
    yearTo: open
      ? undefined
      : Math.max(...series.map(({ yearTo = 0 }) => yearTo)),
  });
};

/** "2 euro 2002–2007", "2 euro 2014–", or "2 euro, first series" when the ECB gives no years. */
const entryTitle = (denomination: string, series: EuroCoinSeries) => {
  const { yearFrom, yearTo, title } = series;
  if (yearFrom === undefined) return `${denomination}, ${title.toLowerCase()}`;
  if (yearTo === yearFrom) return `${denomination} ${yearFrom}`;
  return `${denomination} ${yearFrom}–${yearTo ?? ""}`;
};

const idOf = (country: string, denomination: string) =>
  `${country.toLowerCase()}-eur-${denomination.replace(" ", "-")}`;

const denominationOrder = [
  "1 cent",
  "2 cent",
  "5 cent",
  "10 cent",
  "20 cent",
  "50 cent",
  "1 euro",
  "2 euro",
];

function denominationRows(country: string, denomination: string): Row[] {
  const side = euroNationalSides.find(
    (one) => one.country === country && one.denomination === denomination,
  );
  if (!side) throw new Error(`No ${denomination} national side for ${country}`);
  const key = idOf(country, denomination);
  const page = pageName(denomination);
  const shared = { item_type: "coin", country, denomination };
  const facts = denominationFacts(denomination);
  const specifications = euroCoinSpecifications[denomination] ?? [];
  const entryCredit = facts.composition
    ? ecbAndRegulation("(EU) No 729/2014", sidesPage(page, "en"))
    : ecb(sidesPage(page, "en"));
  return [
    {
      id: key,
      parent_id: country.toLowerCase(),
      title: denomination,
      sort_order: String(denominationOrder.indexOf(denomination) + 1),
      is_addable: "false",
      ...shared,
      ...spanOf(side.series),
      ...credit("facts", ecb(sidesPage(page, "en"))),
      technical_details: specificationWords(specifications, "en"),
      ...credit("notes", ecb(commonPage("en"))),
      ...translatedDetails((language) => {
        const words = translations[language].specifications[denomination];
        return words && specificationWords(words, language);
      }, commonPage),
    },
    ...side.series.flatMap((series, index) => {
      const seriesKey = `${key}-series-${index + 1}`;
      const years = seriesYears(series);
      return [
        {
          id: seriesKey,
          parent_id: key,
          title: series.title,
          series: series.title,
          sort_order: String(index + 1),
          is_addable: "false",
          ...shared,
          ...years,
          ...credit("facts", ecb(sidesPage(page, "en"))),
        },
        {
          id: `${seriesKey}-coin`,
          parent_id: seriesKey,
          title: entryTitle(denomination, series),
          series: series.title,
          sort_order: "1",
          is_addable: "true",
          ...shared,
          strike: "circulation",
          ...facts,
          ...years,
          designers: series.designers?.join("; ") ?? "",
          edge_lettering: series.edgeLettering ?? "",
          ...credit("facts", entryCredit),
          technical_details: side.text,
          ...credit("notes", ecb(sidesPage(page, "en"))),
          ...translatedDetails(
            (language) => translations[language].sides[side.key],
            (language) => sidesPage(page, language),
          ),
        },
      ];
    }),
  ];
}

const rows: Row[] = euroCoinIssuers.flatMap((issuer, index) => [
  {
    id: issuer.code.toLowerCase(),
    title: issuer.name,
    country: issuer.code,
    sort_order: String(index + 1),
    ...credit("facts", ecb(`${ecbPages}/html/${issuer.page}.en.html`)),
  },
  ...denominationOrder.flatMap((denomination) =>
    denominationRows(issuer.code, denomination),
  ),
]);

export const euroCirculationCoins = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
