import type { CatalogKind } from "./fields";

/**
 * Which Catalog nodes are countries, and the order browsing lists a node's
 * groupings in (no Convex imports, so the rules can be tested alone).
 *
 * Every node knows the key of the node it is browsed under
 * (`countryNodeKey`, catalog/tree.ts): its root, or below a Theme, the
 * Theme's child. That child is a country when it has one (2-euro
 * commemoratives › Germany); a Theme's child without a country is a series
 * (Euro banknotes › First series), browsed through its entries like any
 * other grouping (spec §6.2).
 */

/**
 * Whether a node is a country: a country root, or a Theme's country. Only a
 * country is browsed by denomination, and the app names it by `country`, in
 * the reader's language, rather than by its title.
 */
export const isCountryNode = (node: {
  key: string;
  countryNodeKey?: string;
  country?: string;
}) => node.countryNodeKey === node.key && node.country !== undefined;

type CountedNode = { entryCount?: number; title: string } | null;

/**
 * Most entries first, equal counts by title, as the Catalog lists its roots
 * and a Theme its countries. A missing node or count sorts as no entries.
 */
export const byEntryCount = (a: CountedNode, b: CountedNode) =>
  (b?.entryCount ?? 0) - (a?.entryCount ?? 0) ||
  (a?.title ?? "").localeCompare(b?.title ?? "");

/**
 * A node's groupings, given in sort order, as browsing lists them: a Theme's
 * countries most entries first, anything else (a Theme's series, the
 * groupings within a country) in sort order.
 */
export function inBrowseOrder<
  T extends { entryCount: number; title: string; countryNode: boolean },
>(kind: CatalogKind, groupings: T[]): T[] {
  const countries =
    kind === "theme" && groupings.every((grouping) => grouping.countryNode);
  return countries ? [...groupings].sort(byEntryCount) : groupings;
}
