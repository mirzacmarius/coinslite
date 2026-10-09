import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { CatalogItemType } from "../catalog/fields";
import {
  type CatalogFacts,
  entryFacts,
  withCatalogFacts,
} from "./catalogFacts";

/**
 * Reading Items (ADR 0001). An Item linked to a Catalog entry stores only
 * the facts the person changed; the rest are its entry's, looked up as the
 * Item is read (catalogFacts.ts). So EVERY reader of an Item's descriptive
 * facts (country, year, denomination, series, material, Strike, diameter,
 * Numista number, metal, weight, purity) goes through `resolveItems`, or
 * `itemResolver` when reading Items one by one: the Item page, the
 * Collection and its exports, Album lists, totals, Metal values, reports.
 * Reading `ctx.db` Items directly shows a linked Item without its facts.
 */

/** An Item with its descriptive facts resolved: the same fields as stored, filled in from its Catalog entry. */
export type ResolvedItem = Doc<"items">;

/** The Catalog entry an Item links to, as the Item form and Item page need it. */
export type CatalogEntryLink = {
  _id: Id<"catalogNodes">;
  key: string;
  title: string;
  itemType: CatalogItemType;
  /** The entry's facts in Item terms. */
  facts: CatalogFacts;
};

/** A Catalog node as a link for Items, or null when it isn't a Catalog entry. */
export function entryLinkOf(
  node: Doc<"catalogNodes"> | null,
): CatalogEntryLink | null {
  if (!node || node.kind !== "entry") return null;
  return {
    _id: node._id,
    key: node.key,
    title: node.title,
    itemType: node.itemType ?? "coin",
    facts: entryFacts(node),
  };
}

/** The Catalog entry with this key; null for any other node, or none. */
export async function catalogEntryByKey(ctx: QueryCtx, key: string) {
  const node = await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return entryLinkOf(node);
}

/**
 * Resolves Items one at a time, reading each Catalog entry once however
 * many Items link to it. For loops that watch their read budget; otherwise
 * use `resolveItems`.
 */
export function itemResolver(ctx: QueryCtx) {
  const entries = new Map<
    Id<"catalogNodes">,
    Promise<CatalogEntryLink | null>
  >();
  const entry = (id: Id<"catalogNodes">) => {
    let found = entries.get(id);
    if (!found) {
      found = ctx.db.get(id).then(entryLinkOf);
      entries.set(id, found);
    }
    return found;
  };
  return {
    /** The Catalog entry an Item links to; null for manual Items, or an entry no longer in the Catalog. */
    entryOf: async (item: Doc<"items">) =>
      item.catalogEntryId ? await entry(item.catalogEntryId) : null,
    /** The Item with its Catalog entry's facts beneath its own. */
    resolve: async <T extends Doc<"items">>(item: T): Promise<T> => {
      if (!item.catalogEntryId) return item;
      const linked = await entry(item.catalogEntryId);
      // An entry gone from the Catalog leaves the Item with its own facts.
      return linked ? withCatalogFacts(item, linked.facts) : item;
    },
  };
}

/** Items with their descriptive facts resolved, in the same order. */
export async function resolveItems<T extends Doc<"items">>(
  ctx: QueryCtx,
  items: T[],
): Promise<T[]> {
  const resolver = itemResolver(ctx);
  return await Promise.all(items.map((item) => resolver.resolve(item)));
}
