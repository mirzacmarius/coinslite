import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import {
  ancestor,
  ancestorsOf,
  browsingUser,
  byDenomination,
  creditedEntryRow,
  entryRow,
  heldCount,
  nodeByKey,
  nullable,
  stored,
} from "./browse";
import { completion, isSet, setErrors, setLimits } from "./setRules";

/**
 * Sets (spec 6.4): every Catalog entry below one grouping, seen as something
 * to complete. The Set view lists them all, grouped by sub-group and sorted
 * by year, each with how many the person holds.
 *
 * Reads are bounded by the Set, never by the Collection: the entries come
 * from the tree's indexes, one index range per grouping, and how many of
 * each the person holds from their Items linked to that entry (the
 * `by_ownerId_and_catalogEntryId` index), one range per entry. A Set has at
 * most `setLimits.entries` entries, so even the largest stays well inside a
 * query's limits.
 */

const setGroup = v.object({
  /** The sub-group's key; the Set's own key for the entries right below it. */
  key: v.string(),
  /** The groupings from just below the Set down to the sub-group; empty for the Set's own entries. */
  titles: v.array(v.string()),
  /** By year, then sort order. */
  entries: v.array(entryRow),
});

const setView = v.object({
  key: v.string(),
  title: v.string(),
  ancestors: v.array(ancestor),
  /** How many entries the Set has. */
  total: v.number(),
  /** How many of them the person holds at least one Item of. */
  held: v.number(),
  /** `held` out of `total`, rounded down: 100 only when nothing is missing. */
  percent: v.number(),
  groups: v.array(setGroup),
});

/** A grouping with more entries than a Set may have: viewed through the Sets below it. */
const tooLargeSet = v.object({
  key: v.string(),
  title: v.string(),
  ancestors: v.array(ancestor),
  tooLarge: v.literal(true),
});

type SetGroup = typeof setGroup.type;
/** A sub-group of a Set, with its entries in order. */
type EntryGroup = Omit<SetGroup, "entries"> & {
  entries: Doc<"catalogNodes">[];
};

/** A grouping's entries by year then sort order, and the groupings below it in sort order. */
async function childrenOf(
  ctx: QueryCtx,
  parentId: Id<"catalogNodes">,
  budget: { nodes: number },
) {
  const children = await ctx.db
    .query("catalogNodes")
    .withIndex("by_parentId_and_kind_and_yearFrom_and_sortOrder", (q) =>
      q.eq("parentId", parentId),
    )
    .take(budget.nodes + 1);
  if (children.length > budget.nodes) return null;
  budget.nodes -= children.length;
  return {
    // The index puts entries first, by year, then sort order.
    entries: children.filter((child) => child.kind === "entry"),
    groupings: children
      .filter((child) => child.kind !== "entry")
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      ),
  };
}

/**
 * Every entry below a grouping, depth first: its own entries, then each
 * sub-group's. Null when the walk would read more than a Set may hold.
 */
async function entriesBelow(ctx: QueryCtx, node: Doc<"catalogNodes">) {
  const budget = { nodes: setLimits.nodes };
  const groups: EntryGroup[] = [];
  const walk = async (
    grouping: Doc<"catalogNodes">,
    titles: string[],
  ): Promise<boolean> => {
    const children = await childrenOf(ctx, grouping._id, budget);
    if (!children) return false;
    if (children.entries.length > 0) {
      groups.push({ key: grouping.key, titles, entries: children.entries });
    }
    for (const child of children.groupings) {
      if (!(await walk(child, [...titles, child.title]))) return false;
    }
    return true;
  };
  return (await walk(node, [])) ? groups : null;
}

/** The groups' entries as rows, with how many of each the person holds. */
async function withHeld(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  groups: EntryGroup[],
): Promise<SetGroup[]> {
  return await Promise.all(
    groups.map(async ({ key, titles, entries }) => ({
      key,
      titles,
      entries: await Promise.all(
        entries.map(async (entry) =>
          creditedEntryRow(
            ctx,
            entry,
            await heldCount(ctx, ownerId, entry._id),
          ),
        ),
      ),
    })),
  );
}

/** The entries of one denomination in a country, or of one series of it: by series, then year, then sort order. */
async function denominationEntries(
  ctx: QueryCtx,
  countryNodeKey: string,
  denomination: string | null,
  series: string | null | undefined,
) {
  return await ctx.db
    .query("catalogNodes")
    .withIndex(byDenomination, (q) => {
      const ofDenomination = q
        .eq("kind", "entry")
        .eq("countryNodeKey", countryNodeKey)
        .eq("denomination", stored(denomination));
      return series === undefined
        ? ofDenomination
        : ofDenomination.eq("series", stored(series));
    })
    .take(setLimits.entries + 1);
}

/**
 * A denomination's entries grouped by series, as browsing lists the series:
 * by first year (series without years after the rest), then the entries
 * without a series.
 */
function bySeries(entries: Doc<"catalogNodes">[]): EntryGroup[] {
  const groups = new Map<string | undefined, Doc<"catalogNodes">[]>();
  for (const entry of entries) {
    groups.set(entry.series, [...(groups.get(entry.series) ?? []), entry]);
  }
  const firstYear = (group: Doc<"catalogNodes">[]) => {
    const years = group.flatMap(({ yearFrom }) =>
      yearFrom === undefined ? [] : [yearFrom],
    );
    return years.length > 0 ? Math.min(...years) : undefined;
  };
  const lastIf = (missing: boolean) => (missing ? 1 : 0);
  return [...groups]
    .map(([series, group]) => ({ series, group, first: firstYear(group) }))
    .sort(
      (a, b) =>
        lastIf(a.series === undefined) - lastIf(b.series === undefined) ||
        lastIf(a.first === undefined) - lastIf(b.first === undefined) ||
        (a.first ?? 0) - (b.first ?? 0) ||
        (a.series ?? "").localeCompare(b.series ?? ""),
    )
    .map(({ series, group }) => ({
      key: series ?? "",
      titles: series === undefined ? [] : [series],
      entries: group,
    }));
}

/**
 * The entries a Set holds, grouped: below a grouping node, or on a country's
 * denomination path. Null when there's no such Set; "tooLarge" when it has
 * more entries than a Set may.
 */
async function setEntries(
  ctx: QueryCtx,
  node: Doc<"catalogNodes">,
  scope: { denomination?: string | null; series?: string | null },
): Promise<EntryGroup[] | "tooLarge" | null> {
  if (scope.denomination === undefined) {
    const entryCount = node.entryCount ?? 0;
    if (entryCount < 2) return null;
    if (!isSet(entryCount)) return "tooLarge";
    return (await entriesBelow(ctx, node)) ?? "tooLarge";
  }
  // Only a country is browsed by denomination.
  if (node.countryNodeKey !== node.key) return null;
  const entries = await denominationEntries(
    ctx,
    node.key,
    scope.denomination,
    scope.series,
  );
  if (entries.length < 2) return null;
  if (!isSet(entries.length)) return "tooLarge";
  return scope.series === undefined
    ? bySeries(entries)
    : [
        {
          key: scope.series ?? "",
          titles: scope.series === null ? [] : [scope.series],
          entries,
        },
      ];
}

/**
 * A Set: every Catalog entry below a grouping (a country, Theme or grouping
 * node, by `key`), or on a country's denomination path (`key` with a
 * `denomination`, and maybe one of its `series`; null for the entries
 * without one). Its entries come grouped by sub-group (by series on the
 * denomination path) and sorted by year, each with how many the person
 * holds, with how complete the Set is. Null when there's no such Set (one
 * entry is not a Set), and while the Catalog is hidden from the person.
 */
export const get = query({
  args: {
    key: v.string(),
    denomination: v.optional(nullable),
    series: v.optional(nullable),
  },
  returns: v.union(v.null(), setView, tooLargeSet),
  handler: async (ctx, { key, ...scope }) => {
    const user = await browsingUser(ctx);
    if (!user) return null;
    const node = await nodeByKey(ctx, key);
    if (!node || node.kind === "entry") return null;
    const groups = await setEntries(ctx, node, scope);
    if (!groups) return null;
    const about = {
      key: node.key,
      title: node.title,
      ancestors: await ancestorsOf(ctx, node),
    };
    if (groups === "tooLarge") return { ...about, tooLarge: true as const };
    const rows = await withHeld(ctx, user._id, groups);
    const entries = rows.flatMap((group) => group.entries);
    return {
      ...about,
      ...completion(
        entries.filter((entry) => entry.held > 0).length,
        entries.length,
      ),
      groups: rows,
    };
  },
});

/**
 * How many pieces of each of these Catalog entries the person holds, for
 * marking search results while selecting several. Keys that aren't Catalog
 * entries are left out. At most `setLimits.bulkAdd` keys.
 */
export const heldCounts = query({
  args: { keys: v.array(v.string()) },
  returns: v.array(v.object({ key: v.string(), held: v.number() })),
  handler: async (ctx, { keys }) => {
    const user = await browsingUser(ctx);
    if (keys.length > setLimits.bulkAdd) {
      throw new ConvexError(setErrors.tooManyEntries);
    }
    if (!user) return [];
    const counts = await Promise.all(
      keys.map(async (key) => {
        const node = await nodeByKey(ctx, key);
        return node?.kind === "entry"
          ? [{ key, held: await heldCount(ctx, user._id, node._id) }]
          : [];
      }),
    );
    return counts.flat();
  },
});
