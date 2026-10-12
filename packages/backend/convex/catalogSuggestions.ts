import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import type { CatalogItemType } from "./catalog/fields";
import { catalogVisibleTo } from "./featureFlags";
import { itemNotFound, requireCatalogEntry, requireOwnItem } from "./items";
import { bulkErrors, bulkLimits } from "./items/bulkRules";
import { catalogFactNames, overridesOnLink } from "./items/catalogFacts";
import {
  catalogCandidates,
  suggestable,
  suggestionLimits,
} from "./items/catalogSuggestions";
import { sameDenomination } from "./items/denominations";
import { type CatalogEntryLink, catalogEntryByKey } from "./items/resolve";
import { requireSetUpUser } from "./utils/auth";
import { clearWant } from "./wants";

/**
 * Suggesting Catalog entries for Items added by hand or imported without
 * one (items/catalogSuggestions.ts decides which), and linking an Item to
 * the one the person confirms. The Item page suggests the best for its Item
 * with Link and Not this; an import offers to link what it added in one go.
 *
 * Candidates are read through slim entries (ADR 0008) by country, Item type
 * and denomination, then by first year, so a look-up reads a country's
 * distinct denominations and the few entries of the matching ones, however
 * large the Catalog grows. An entry without a slim entry (before
 * `catalog/slimEntries:backfill`) isn't suggested.
 */

export const suggestionErrors = {
  /** The Item is already linked to another Catalog entry. */
  alreadyLinked: "ALREADY_LINKED",
  /** The entry is of another Item type than the Item. */
  otherType: "CATALOG_ENTRY_OTHER_TYPE",
  /** More Items than one look-up takes. */
  tooManyItems: "TOO_MANY_ITEMS_FOR_SUGGESTIONS",
} as const;

const bySuggestion = "by_country_and_itemType_and_denomination_and_yearFrom";

/**
 * Finds each Item's candidates, reading each country's denominations and
 * each denomination's entries for a year once however many Items ask.
 */
function candidateFinder(ctx: QueryCtx) {
  const denominations = new Map<string, Promise<string[]>>();
  const entries = new Map<string, Promise<Doc<"catalogSlimEntries">[]>>();

  /** The distinct denominations among a country's entries of one Item type, one read each. */
  const denominationsOf = (
    country: string,
    itemType: CatalogItemType | undefined,
  ) => {
    const cacheKey = JSON.stringify([country, itemType ?? null]);
    let found = denominations.get(cacheKey);
    if (!found) {
      found = (async () => {
        const distinct: string[] = [];
        let last: string | undefined;
        while (distinct.length < suggestionLimits.denominations) {
          const next = await ctx.db
            .query("catalogSlimEntries")
            .withIndex(bySuggestion, (q) =>
              q
                .eq("country", country)
                .eq("itemType", itemType)
                .gt("denomination", last),
            )
            .first();
          if (next?.denomination === undefined) break;
          distinct.push(next.denomination);
          last = next.denomination;
        }
        return distinct;
      })();
      denominations.set(cacheKey, found);
    }
    return found;
  };

  /**
   * A denomination's entries first issued by `year`: the earliest started,
   * where general issues are, and the latest, where that year's are.
   */
  const entriesOf = (
    country: string,
    itemType: CatalogItemType | undefined,
    denomination: string,
    year: number,
  ) => {
    const cacheKey = JSON.stringify([
      country,
      itemType ?? null,
      denomination,
      year,
    ]);
    let found = entries.get(cacheKey);
    if (!found) {
      const issuedBy = () =>
        ctx.db
          .query("catalogSlimEntries")
          .withIndex(bySuggestion, (q) =>
            q
              .eq("country", country)
              .eq("itemType", itemType)
              .eq("denomination", denomination)
              .gt("yearFrom", undefined)
              .lte("yearFrom", year),
          );
      found = Promise.all([
        issuedBy().take(suggestionLimits.entriesPerEnd),
        issuedBy().order("desc").take(suggestionLimits.entriesPerEnd),
      ]).then(([earliest, latest]) => {
        const read = new Set(earliest.map(({ _id }) => _id));
        return [...earliest, ...latest.filter(({ _id }) => !read.has(_id))];
      });
      entries.set(cacheKey, found);
    }
    return found;
  };

  /** An Item's candidates, best first, leaving out those it turned down. */
  return async (item: Doc<"items">) => {
    if (item.catalogEntryId !== undefined || !suggestable(item)) return [];
    const { type, country, denomination, year } = item;
    // An entry stored without an Item type is a coin's.
    const itemTypes = type === "coin" ? (["coin", undefined] as const) : [type];
    const found: Doc<"catalogSlimEntries">[] = [];
    for (const itemType of itemTypes) {
      for (const stored of await denominationsOf(country, itemType)) {
        if (sameDenomination(stored, denomination))
          found.push(...(await entriesOf(country, itemType, stored, year)));
      }
    }
    const dismissed = new Set(item.dismissedCatalogEntryIds ?? []);
    return catalogCandidates(
      item,
      found.filter((entry) => !dismissed.has(entry.entryId)),
    );
  };
}

const suggestion = v.object({ key: v.string(), title: v.string() });

/**
 * The Catalog entries suggested for one of the signed-in person's Items,
 * best first, at most `suggestionLimits.candidates`. None for an Item
 * linked to an entry, a stamp, one without a country, year or
 * denomination, anyone else's, and while the Catalog is hidden from them.
 */
export const forItem = query({
  args: { itemId: v.id("items") },
  returns: v.array(suggestion),
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const item = await ctx.db.get("items", itemId);
    if (!item || item.ownerId !== owner._id) return [];
    if (!(await catalogVisibleTo(ctx, owner))) return [];
    const candidates = await candidateFinder(ctx)(item);
    return candidates.map(({ key, title }) => ({ key, title }));
  },
});

/**
 * The best Catalog entry suggested for each of these Items of the signed-in
 * person's that has one, for linking them in one go after an import: at
 * most `suggestionLimits.items` Items a call. Items that aren't theirs, or
 * are gone, are left out.
 */
export const forItems = query({
  args: { itemIds: v.array(v.id("items")) },
  returns: v.array(
    v.object({ itemId: v.id("items"), title: v.string(), entry: suggestion }),
  ),
  handler: async (ctx, { itemIds }) => {
    const owner = await requireSetUpUser(ctx);
    if (itemIds.length > suggestionLimits.items)
      throw new ConvexError(suggestionErrors.tooManyItems);
    if (!(await catalogVisibleTo(ctx, owner))) return [];
    const candidatesOf = candidateFinder(ctx);
    const rows = [];
    for (const itemId of new Set(itemIds)) {
      const item = await ctx.db.get("items", itemId);
      if (!item || item.ownerId !== owner._id) continue;
      const [best] = await candidatesOf(item);
      if (best)
        rows.push({
          itemId,
          title: item.title,
          entry: { key: best.key, title: best.title },
        });
    }
    return rows;
  },
});

/** An Item and the Catalog entry it's to be linked to. */
type Link = { item: Doc<"items">; entry: CatalogEntryLink };

/**
 * Whether an Item is to be linked to an entry: not when it already is.
 * Throws when it can't be: it's linked to another entry, or the entry is of
 * another Item type.
 */
function needsLink({ item, entry }: Link) {
  if (item.catalogEntryId === entry._id) return false;
  if (item.catalogEntryId !== undefined)
    throw new ConvexError(suggestionErrors.alreadyLinked);
  if (entry.itemType !== item.type)
    throw new ConvexError(suggestionErrors.otherType);
  return true;
}

/**
 * Links an Item added without a Catalog entry to one (ADR 0001), once
 * `needsLink` says it may: the facts it holds that the entry says the same
 * of follow the entry from then on, the rest stay its own
 * (items/catalogFacts.ts overridesOnLink). An owned Item takes the entry off
 * the Wantlist, as adding one from it does.
 */
async function linkItem(ctx: MutationCtx, { item, entry }: Link) {
  const kept = overridesOnLink(item, entry.facts);
  const facts = Object.fromEntries(
    catalogFactNames.map((name) => [name, kept[name]]),
  );
  await ctx.db.patch("items", item._id, {
    ...facts,
    catalogEntryId: entry._id,
    // Facts frozen from an entry that left the Catalog; the new one's are read live.
    catalogDetails: undefined,
  });
  if (item.soldOn === undefined) await clearWant(ctx, item.ownerId, entry._id);
}

/** One of the signed-in person's Items; anyone else's, or one that's gone, is not found. */
async function ownItem(
  ctx: QueryCtx,
  owner: Doc<"users">,
  itemId: Id<"items">,
) {
  const item = await ctx.db.get("items", itemId);
  if (!item || item.ownerId !== owner._id) throw new ConvexError(itemNotFound);
  return item;
}

/** Links one of the signed-in person's Items to a suggested Catalog entry ("Link"). */
export const link = mutation({
  args: { itemId: v.id("items"), catalogEntryKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { itemId, catalogEntryKey }) => {
    const owner = await requireSetUpUser(ctx);
    const planned = {
      item: await ownItem(ctx, owner, itemId),
      entry: await requireCatalogEntry(ctx, owner, catalogEntryKey),
    };
    if (needsLink(planned)) await linkItem(ctx, planned);
    return null;
  },
});

/**
 * Links several of the signed-in person's Items, each to its Catalog entry,
 * after an import: at most `bulkLimits.items`. Every Item and entry is
 * checked before anything is written, so all are linked or none; one
 * already linked to its entry is left as it is. Returns how many it linked.
 */
export const linkMany = mutation({
  args: {
    links: v.array(
      v.object({ itemId: v.id("items"), catalogEntryKey: v.string() }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, { links }) => {
    const owner = await requireSetUpUser(ctx);
    if (links.length > bulkLimits.items)
      throw new ConvexError(bulkErrors.tooManyItems);
    const entries = new Map<string, CatalogEntryLink>();
    const seen = new Set<Id<"items">>();
    const planned: Link[] = [];
    for (const { itemId, catalogEntryKey } of links) {
      if (seen.has(itemId)) continue;
      seen.add(itemId);
      const item = await ownItem(ctx, owner, itemId);
      let entry = entries.get(catalogEntryKey);
      if (!entry) {
        entry = await requireCatalogEntry(ctx, owner, catalogEntryKey);
        entries.set(catalogEntryKey, entry);
      }
      if (needsLink({ item, entry })) planned.push({ item, entry });
    }
    for (const link of planned) await linkItem(ctx, link);
    return planned.length;
  },
});

/**
 * Turns down a Catalog entry suggested for one of the signed-in person's
 * Items ("Not this"): it isn't suggested for that Item again. The Item
 * remembers the latest `suggestionLimits.dismissed` it turned down.
 */
export const dismiss = mutation({
  args: { itemId: v.id("items"), catalogEntryKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { itemId, catalogEntryKey }) => {
    const item = await requireOwnItem(ctx, itemId);
    const entry = await catalogEntryByKey(ctx, catalogEntryKey);
    if (!entry) return null;
    const dismissed = item.dismissedCatalogEntryIds ?? [];
    if (dismissed.includes(entry._id)) return null;
    await ctx.db.patch("items", itemId, {
      dismissedCatalogEntryIds: [...dismissed, entry._id].slice(
        -suggestionLimits.dismissed,
      ),
    });
    return null;
  },
});
