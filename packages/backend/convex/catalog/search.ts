import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";
import { catalogVisibleTo } from "../featureFlags";
import { requireUserId } from "../utils/auth";
import {
  catalogItemType,
  catalogKind,
  preciousMetal,
} from "../utils/validators";
import { isCountryNode } from "./browse";
import { catalogLimits, searchTextOf, valuesFromFields } from "./fields";
import { heldCount } from "./held";
import {
  catalogSearchLimits,
  matchesEveryWord,
  searchQueryWords,
} from "./searchWords";

/**
 * Finding Catalog nodes by typing a few words, for the Catalog page (every
 * node) and the Catalog picker (the chosen Item type's Catalog entries).
 */

/** Nodes read from the search index per search, at most. */
const scanned = 256;

const hit = v.object({
  _id: v.id("catalogNodes"),
  key: v.string(),
  path: v.string(),
  kind: catalogKind,
  title: v.string(),
  sortOrder: v.number(),
  itemType: v.optional(catalogItemType),
  country: v.optional(v.string()),
  /** A country (see browse.ts), which the app names in the reader's language. */
  countryNode: v.boolean(),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  yearFrom: v.optional(v.number()),
  yearTo: v.optional(v.number()),
  metal: v.optional(preciousMetal),
  weight: v.optional(v.number()),
  fineness: v.optional(v.number()),
  /** With `withHeld`, how many pieces of a Catalog entry the person holds. */
  held: v.optional(v.number()),
});

export type CatalogSearchHit = typeof hit.type;

const hitOf = (node: Doc<"catalogNodes">): CatalogSearchHit => ({
  _id: node._id,
  key: node.key,
  path: node.path,
  kind: node.kind,
  title: node.title,
  sortOrder: node.sortOrder,
  itemType: node.itemType,
  country: node.country,
  countryNode: isCountryNode(node),
  denomination: node.denomination,
  series: node.series,
  yearFrom: node.yearFrom,
  yearTo: node.yearTo,
  metal: node.metal,
  weight: node.weight,
  fineness: node.fineness,
});

/**
 * The nodes matching every word typed (each word starts a word of the title,
 * denomination, series or country), best matches first, grouped by country
 * and then series. At most 50; `capped` says there were more. The Catalog
 * picker asks for one Item type's Catalog entries only, and while selecting
 * several, `withHeld`, how many of each the person holds, so the results
 * come complete in one answer. Nothing matches while the Catalog is hidden
 * from the person (featureFlags.ts).
 */
export const find = query({
  args: {
    text: v.string(),
    itemType: v.optional(catalogItemType),
    entriesOnly: v.optional(v.boolean()),
    withHeld: v.optional(v.boolean()),
  },
  returns: v.object({
    groups: v.array(
      v.object({
        country: v.optional(v.string()),
        series: v.optional(v.string()),
        nodes: v.array(hit),
      }),
    ),
    capped: v.boolean(),
  }),
  handler: async (ctx, { text, itemType, entriesOnly, withHeld }) => {
    const user = await ctx.db.get("users", await requireUserId(ctx));
    const words = searchQueryWords(text);
    if (words.length === 0 || !(await catalogVisibleTo(ctx, user)))
      return { groups: [], capped: false };

    const candidates = await ctx.db
      .query("catalogNodes")
      .withSearchIndex("search_searchText", (q) => {
        let search = q.search("searchText", words.join(" "));
        if (itemType) search = search.eq("itemType", itemType);
        if (entriesOnly) search = search.eq("kind", "entry");
        return search;
      })
      .take(scanned);
    const matches = candidates.filter((node) =>
      matchesEveryWord(words, node.searchText),
    );
    const shown = matches.slice(0, catalogSearchLimits.results);
    const hits = await Promise.all(
      shown.map(async (node) =>
        withHeld && user && node.kind === "entry"
          ? {
              ...hitOf(node),
              held: (await heldCount(ctx, user._id, node._id)).held,
            }
          : hitOf(node),
      ),
    );
    return {
      groups: groupByCountryAndSeries(hits),
      capped: matches.length > shown.length,
    };
  },
});

const kindOrder: Record<CatalogSearchHit["kind"], number> = {
  country: 0,
  theme: 0,
  grouping: 1,
  entry: 2,
};

/** Within a group: roots and groupings first, then by year (none first), then sort order. */
const byKindThenYear = (a: CatalogSearchHit, b: CatalogSearchHit) =>
  kindOrder[a.kind] - kindOrder[b.kind] ||
  (a.yearFrom ?? catalogLimits.earliestYear - 1) -
    (b.yearFrom ?? catalogLimits.earliestYear - 1) ||
  a.sortOrder - b.sortOrder ||
  a.title.localeCompare(b.title);

/**
 * Groups in the order their best match comes, with a country's groups
 * together.
 */
function groupByCountryAndSeries(hits: CatalogSearchHit[]) {
  const countries = new Map<string, Map<string, CatalogSearchHit[]>>();
  for (const each of hits) {
    const country = countries.get(each.country ?? "") ?? new Map();
    countries.set(each.country ?? "", country);
    const series = country.get(each.series ?? "") ?? [];
    country.set(each.series ?? "", series);
    series.push(each);
  }
  return [...countries].flatMap(([country, series]) =>
    [...series].map(([name, nodes]) => ({
      ...(country && { country }),
      ...(name && { series: name }),
      nodes: nodes.sort(byKindThenYear),
    })),
  );
}

/**
 * Brings every node's search words up to date, a batch at a time, after the
 * words a node is found by change. Run it once on a deployment that already
 * holds the Catalog: `npx convex run catalog/search:reindex`.
 */
export const reindex = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { cursor = null, batchSize = 200 }) => {
    const batch = await ctx.db
      .query("catalogNodes")
      .paginate({ numItems: batchSize, cursor });
    for (const node of batch.page) {
      const searchText = searchTextOf(valuesFromFields(node));
      if (searchText !== node.searchText)
        await ctx.db.patch("catalogNodes", node._id, { searchText });
    }
    if (!batch.isDone)
      await ctx.scheduler.runAfter(0, internal.catalog.search.reindex, {
        cursor: batch.continueCursor,
        batchSize,
      });
    return null;
  },
});
