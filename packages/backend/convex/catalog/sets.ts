import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { catalogItemType, catalogKind } from "../utils/validators";
import {
  ancestor,
  ancestorsOf,
  browsingUser,
  byDenomination,
  creditedEntryRow,
  entryRow,
  nodeByKey,
  nullable,
  stored,
} from "./browse";
import { isCountryNode } from "./countryNodes";
import {
  type DenominationGroup,
  storedDenominationCount,
} from "./denominationCounts";
import { heldCount } from "./held";
import {
  type FoundSet,
  type NodeName,
  type SetProgress,
  type SetScope,
  setIdOf,
} from "./setProgress";
import { completion, isSet, setErrors, setLimits } from "./setRules";

/**
 * Sets (spec 6.4): every Catalog entry below one grouping, seen as something
 * to complete. The Set view lists them all, grouped by sub-group and sorted
 * by year, each with how many the person holds.
 *
 * Reads are bounded by the Set, never by the Collection: the entries come
 * from the tree's indexes, one index range per grouping, and how many of
 * each the person holds from the Items linked to that entry they haven't
 * sold (the `by_ownerId_and_catalogEntryId_and_soldOn` index), one range
 * per entry. A Set has at
 * most `setLimits.entries` entries, so even the largest stays well inside a
 * query's limits.
 */

const setGroup = v.object({
  /** The sub-group's key; the Set's own key for the entries right below it. */
  key: v.string(),
  /** The groupings from just below the Set down to the sub-group; empty for the Set's own entries. */
  titles: v.array(v.string()),
  /**
   * The country the sub-group is in, when the Set spans countries (a Theme):
   * the first title is that country's, which the app names in the reader's
   * language.
   */
  country: v.optional(v.string()),
  /** By year, then sort order. */
  entries: v.array(entryRow),
});

/** The grouping a Set is made of; a country (see browse.ts) comes with its code. */
const setNode = {
  key: v.string(),
  title: v.string(),
  country: v.optional(v.string()),
  countryNode: v.boolean(),
  ancestors: v.array(ancestor),
};

const setView = v.object({
  ...setNode,
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
  ...setNode,
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
    country?: string,
  ): Promise<boolean> => {
    const children = await childrenOf(ctx, grouping._id, budget);
    if (!children) return false;
    if (children.entries.length > 0) {
      groups.push({
        key: grouping.key,
        titles,
        ...(country !== undefined && { country }),
        entries: children.entries,
      });
    }
    for (const child of children.groupings) {
      // Nothing below it to show, however many groupings it holds.
      if (child.entryCount === 0) continue;
      const inCountry =
        country ?? (isCountryNode(child) ? child.country : undefined);
      if (!(await walk(child, [...titles, child.title], inCountry)))
        return false;
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
    groups.map(async ({ entries, ...group }) => ({
      ...group,
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
export function bySeries(entries: Doc<"catalogNodes">[]): EntryGroup[] {
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
  if (!isCountryNode(node)) return null;
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
      ...(isCountryNode(node) &&
        node.country !== undefined && { country: node.country }),
      countryNode: isCountryNode(node),
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
 * marking recently picked entries while selecting several (search results
 * bring their own: search.ts `withHeld`). Keys that aren't Catalog entries
 * are left out. At most `setLimits.bulkAdd` keys.
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
          ? [{ key, held: (await heldCount(ctx, user._id, node._id)).held }]
          : [];
      }),
    );
    return counts.flat();
  },
});

/** Which Set "View as Set" opens: see `setOfEntry`. */
export const setScope = v.object({
  key: v.string(),
  denomination: v.optional(nullable),
  series: v.optional(nullable),
});

/**
 * The Set an Item made from `entry` belongs to, for "View as Set": the
 * grouping right above the entry, or for an entry right below a country,
 * its denomination and series on the country's denomination path. Null
 * when that is too small or too large to be a Set (setRules.ts isSet).
 * Decided from stored entry counts, so it reads the parent and at most one
 * denomination count, however large the Set.
 */
export async function setOfEntry(
  ctx: QueryCtx,
  entry: Doc<"catalogNodes">,
): Promise<typeof setScope.type | null> {
  const set = await entrySet(entry, {
    node: (key) => nodeByKey(ctx, key),
    entryCount: async (group) =>
      (await storedDenominationCount(ctx, group)) ??
      // Not counted yet, until catalog/denominationCounts:backfill has run.
      (
        await denominationEntries(
          ctx,
          group.countryNodeKey,
          group.denomination ?? null,
          group.series ?? null,
        )
      ).length,
  });
  return set?.scope ?? null;
}

/** How `entrySet` reads the tree: a node by key, and a denomination path's entry count (null when unknown). */
type SetReads = {
  node: (key: string) => Promise<Doc<"catalogNodes"> | null>;
  entryCount: (group: DenominationGroup) => Promise<number | null>;
};

/**
 * The Set an entry belongs to (see `setOfEntry`), with the grouping it is
 * of and how many entries it has. Null when there's none, or its entry
 * count is unknown.
 */
async function entrySet(
  entry: Doc<"catalogNodes">,
  reads: SetReads,
): Promise<{
  scope: SetScope;
  node: Doc<"catalogNodes">;
  total: number;
} | null> {
  const parentKey = entry.path.split("/").at(-2);
  const parent = parentKey ? await reads.node(parentKey) : null;
  if (!parent) return null;
  if (!isCountryNode(parent)) {
    const total = parent.entryCount ?? 0;
    return isSet(total)
      ? { scope: { key: parent.key }, node: parent, total }
      : null;
  }
  const group = {
    countryNodeKey: parent.key,
    denomination: entry.denomination,
    series: entry.series,
  };
  const total = await reads.entryCount(group);
  if (total === null || !isSet(total)) return null;
  return { scope: denominationSet(group), node: parent, total };
}

/** A country's entries of one denomination and series, as a Set. */
const denominationSet = (group: DenominationGroup): SetScope => ({
  key: group.countryNodeKey,
  denomination: group.denomination ?? null,
  series: group.series ?? null,
});

/** A Catalog node as the app names it (setProgress.ts NodeName). */
function nameOf(node: Doc<"catalogNodes">): NodeName {
  return {
    key: node.key,
    title: node.title,
    kind: node.kind,
    ...(node.country !== undefined && { country: node.country }),
    countryNode: isCountryNode(node),
    ...(node.denomination !== undefined && {
      denomination: node.denomination,
    }),
    ...(node.itemType !== undefined && { itemType: node.itemType }),
    ...(node.series !== undefined && { series: node.series }),
  };
}

/** A node as Set progress names it, for return values. */
export const nodeName = v.object({
  key: v.string(),
  title: v.string(),
  kind: v.optional(catalogKind),
  country: v.optional(v.string()),
  countryNode: v.boolean(),
  denomination: v.optional(v.string()),
  itemType: v.optional(catalogItemType),
  series: v.optional(v.string()),
});

/** What `setsOfEntries` finds, for return values (setProgress.ts SetProgress). */
export const setProgress = v.object({
  sets: v.array(
    v.object({
      id: v.string(),
      scope: setScope,
      node: nodeName,
      parent: v.optional(nodeName),
      total: v.number(),
    }),
  ),
  held: v.array(v.object({ id: v.string(), sets: v.array(v.string()) })),
});

/** Reads each thing once, however often it's asked for. */
function readOnce<A, T>(
  keyOf: (arg: A) => string,
  read: (arg: A) => Promise<T>,
) {
  const reads = new Map<string, Promise<T>>();
  return (arg: A) => {
    const key = keyOf(arg);
    let found = reads.get(key);
    if (!found) {
      found = read(arg);
      reads.set(key, found);
    }
    return found;
  };
}

/** An entry's own denomination and series in its country, as a Set; null outside any country. */
function denominationPathOf(entry: Doc<"catalogNodes">): SetScope | null {
  if (entry.countryNodeKey === undefined) return null;
  return denominationSet({
    countryNodeKey: entry.countryNodeKey,
    denomination: entry.denomination,
    series: entry.series,
  });
}

/**
 * Set progress (setProgress.ts) for distinct Catalog entries a person
 * holds: the Set each one opens with "View as Set", with its entry count,
 * and every Set each entry counts toward on a Set view: each grouping above
 * it, and its denomination and series in its country. Reads each node and
 * count at most once, and only stored counts: a denomination path not
 * counted yet is left out rather than counted here, so this reads at most
 * a few documents per entry however large its Set.
 */
export async function setsOfEntries(
  ctx: QueryCtx,
  entries: Doc<"catalogNodes">[],
): Promise<SetProgress> {
  const node = readOnce(
    (key: string) => key,
    (key) => nodeByKey(ctx, key),
  );
  const reads: SetReads = {
    node,
    entryCount: readOnce(
      (group: DenominationGroup) => setIdOf(denominationSet(group)),
      (group) => storedDenominationCount(ctx, group),
    ),
  };
  const sets = new Map<string, FoundSet>();
  await Promise.all(
    entries.map(async (entry) => {
      const set = await entrySet(entry, reads);
      if (!set) return;
      // A grouping Set is named with the grouping above it.
      const aboveKey =
        set.scope.denomination === undefined
          ? set.node.path.split("/").at(-2)
          : undefined;
      const above = aboveKey ? await node(aboveKey) : null;
      sets.set(setIdOf(set.scope), {
        id: setIdOf(set.scope),
        scope: set.scope,
        node: nameOf(set.node),
        ...(above && { parent: nameOf(above) }),
        total: set.total,
      });
    }),
  );
  return {
    sets: [...sets.values()],
    held: entries.map((entry) => {
      const path = denominationPathOf(entry);
      return {
        id: entry._id,
        sets: [
          ...entry.path.split("/").slice(0, -1),
          ...(path ? [setIdOf(path)] : []),
        ],
      };
    }),
  };
}
