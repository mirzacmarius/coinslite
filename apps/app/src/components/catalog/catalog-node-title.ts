/**
 * What a Catalog node is called (useCatalogFormat's nodeTitle), apart from
 * the words of the reader's language, so the rule can be tested alone.
 */

/** The Themes the app names in the reader's language, by node key. */
const themeNames = {
  "eur2-commemoratives": "euroCommemoratives",
  "eur-banknotes": "euroBanknotes",
} as const;
export type ThemeName = (typeof themeNames)[keyof typeof themeNames];

const themeNameOf = (key?: string) =>
  key !== undefined && Object.hasOwn(themeNames, key)
    ? themeNames[key as keyof typeof themeNames]
    : undefined;

/** A Catalog node, as far as its name goes. */
export type TitledNode = {
  key?: string;
  title: string;
  kind?: string;
  country?: string;
  countryNode?: boolean;
  denomination?: string;
  itemType?: string;
  series?: string;
};

/** The reader's words for what the Catalog names in their language. */
export type NodeWords = {
  theme: (name: ThemeName) => string;
  /** Norway's commemorative coins grouping. */
  commemorativeCoins: () => string;
  /** Norway's groupings of one denomination: "1 krone coins". */
  denominationGrouping: (
    itemType: string | undefined,
    denomination: string,
  ) => string;
  country: (code: string) => string;
};

/**
 * A known Theme by its name in the reader's language, a country by its
 * name in the reader's language, anything else by its title, which stays as
 * the Catalog has it (titles and series are kept in the issuing country's
 * language). A Theme's series has no country, so it goes by its title.
 */
export function catalogNodeTitle(node: TitledNode, words: NodeWords) {
  const theme = themeNameOf(node.key);
  if (theme) return words.theme(theme);
  if (node.country === "NO" && node.key?.endsWith("-comm"))
    return words.commemorativeCoins();
  if (
    node.country === "NO" &&
    node.kind === "grouping" &&
    node.denomination &&
    node.series === undefined
  )
    return words.denominationGrouping(node.itemType, node.denomination);
  return node.countryNode && node.country
    ? words.country(node.country)
    : node.title;
}
