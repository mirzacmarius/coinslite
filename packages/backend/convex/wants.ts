import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import {
  browsingUser,
  creditedEntryRow,
  entryRow,
  heldCount,
  isCountryNode,
  nodeByKey,
} from "./catalog/browse";
import { setErrors, setLimits } from "./catalog/setRules";
import { bySeries } from "./catalog/sets";
import { wantErrors, wantLimits } from "./wants/rules";

/**
 * The Wantlist: the Catalog entries a person is looking for. One want per
 * entry per person, at most `wantLimits.wants` of them, on either plan.
 * Adding an Item linked to a wanted entry clears the want (`clearWant`).
 * Like the rest of the Catalog, wants are neither read nor written while
 * the Catalog is hidden from the person.
 */

/** The Catalog key the backend reports for an entry that's gone or hidden (items.ts). */
const catalogEntryNotFound = "CATALOG_ENTRY_NOT_FOUND";

const wantsOf = (ctx: QueryCtx, ownerId: Id<"users">) =>
  ctx.db
    .query("wants")
    .withIndex("by_ownerId_and_catalogEntryId", (q) =>
      q.eq("ownerId", ownerId),
    );

async function wantOf(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) {
  return await ctx.db
    .query("wants")
    .withIndex("by_ownerId_and_catalogEntryId", (q) =>
      q.eq("ownerId", ownerId).eq("catalogEntryId", entryId),
    )
    .unique();
}

/** How many entries a person wants. */
async function wantCount(ctx: QueryCtx, ownerId: Id<"users">) {
  return (await wantsOf(ctx, ownerId).take(wantLimits.wants + 1)).length;
}

/** The person's wants with their Catalog entries, skipping any entry that's gone. */
async function wantedEntries(ctx: QueryCtx, ownerId: Id<"users">) {
  const wants = await wantsOf(ctx, ownerId).take(wantLimits.wants);
  const entries = await Promise.all(
    wants.map((want) => ctx.db.get(want.catalogEntryId)),
  );
  return entries.filter(
    (entry): entry is Doc<"catalogNodes"> => entry?.kind === "entry",
  );
}

/** The person writing wants, who must see the Catalog. */
async function wantingUser(ctx: MutationCtx) {
  const user = await browsingUser(ctx);
  if (!user) throw new ConvexError(catalogEntryNotFound);
  return user;
}

/**
 * Removes a person's want of a Catalog entry, if they have one; every way of
 * adding an Item linked to an entry calls this in the same transaction.
 * Whether there was a want to remove.
 */
export async function clearWant(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) {
  const want = await wantOf(ctx, ownerId, entryId);
  if (want) await ctx.db.delete(want._id);
  return want !== null;
}

/** Removes everyone's wants of a Catalog entry, as it leaves the Catalog (catalog/tree.ts). */
export async function clearWantsOfEntry(
  ctx: MutationCtx,
  entryId: Id<"catalogNodes">,
) {
  for await (const want of ctx.db
    .query("wants")
    .withIndex("by_catalogEntryId", (q) => q.eq("catalogEntryId", entryId))) {
    await ctx.db.delete(want._id);
  }
}

/**
 * Wants a Catalog entry, or stops wanting it. Wanting one already wanted, or
 * unwanting one that isn't, changes nothing. Past `wantLimits.wants` a new
 * want is refused.
 */
export const setWanted = mutation({
  args: { key: v.string(), wanted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { key, wanted }) => {
    const user = await wantingUser(ctx);
    const entry = await nodeByKey(ctx, key);
    if (entry?.kind !== "entry") throw new ConvexError(catalogEntryNotFound);
    const want = await wantOf(ctx, user._id, entry._id);
    if (!wanted) {
      if (want) await ctx.db.delete(want._id);
      return null;
    }
    if (want) return null;
    if ((await wantCount(ctx, user._id)) >= wantLimits.wants)
      throw new ConvexError(wantErrors.tooManyWants);
    await ctx.db.insert("wants", {
      ownerId: user._id,
      catalogEntryId: entry._id,
    });
    return null;
  },
});

/**
 * "Want all missing" on a Set: wants each of these Catalog entries the person
 * neither holds nor wants yet, at most `setLimits.bulkAdd` keys a call. All
 * or nothing: refused when they'd pass `wantLimits.wants`. Keys that aren't
 * Catalog entries are passed over. How many entries it wanted.
 */
export const wantMany = mutation({
  args: { keys: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, { keys }) => {
    const user = await wantingUser(ctx);
    if (keys.length > setLimits.bulkAdd)
      throw new ConvexError(setErrors.tooManyEntries);
    const wanting: Id<"catalogNodes">[] = [];
    for (const key of new Set(keys)) {
      const entry = await nodeByKey(ctx, key);
      if (entry?.kind !== "entry") continue;
      if ((await heldCount(ctx, user._id, entry._id)).held > 0) continue;
      if (await wantOf(ctx, user._id, entry._id)) continue;
      wanting.push(entry._id);
    }
    if (wanting.length === 0) return 0;
    if ((await wantCount(ctx, user._id)) + wanting.length > wantLimits.wants)
      throw new ConvexError(wantErrors.tooManyWants);
    for (const catalogEntryId of wanting)
      await ctx.db.insert("wants", { ownerId: user._id, catalogEntryId });
    return wanting.length;
  },
});

/** The keys of the Catalog entries the person wants, for marking them wherever entries are listed. */
export const keys = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const user = await browsingUser(ctx);
    if (!user) return [];
    return (await wantedEntries(ctx, user._id)).map((entry) => entry.key);
  },
});

/** How many Catalog entries the person wants, for the Overview; 0 while the Catalog is hidden. */
export const count = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await browsingUser(ctx);
    if (!user) return 0;
    return await wantCount(ctx, user._id);
  },
});

const wantlistGroup = v.object({
  /** The country's node key, or for entries outside any country, their root's. */
  key: v.string(),
  title: v.string(),
  /** A country's code, which the app names in the reader's language. */
  country: v.optional(v.string()),
  /** Its series as browsing lists them, null for the entries without one. */
  series: v.array(
    v.object({
      series: v.union(v.string(), v.null()),
      entries: v.array(entryRow),
    }),
  ),
});

/**
 * The Wantlist: the entries the person wants, grouped by country (most
 * entries first, as the Catalog lists them) and then by series (as browsing
 * a denomination lists them), each entry with how many the person holds.
 * Empty while the Catalog is hidden from them.
 */
export const list = query({
  args: {},
  returns: v.array(wantlistGroup),
  handler: async (ctx) => {
    const user = await browsingUser(ctx);
    if (!user) return [];
    const byCountry = new Map<string, Doc<"catalogNodes">[]>();
    for (const entry of await wantedEntries(ctx, user._id)) {
      const key = entry.countryNodeKey ?? entry.path.split("/")[0] ?? "";
      byCountry.set(key, [...(byCountry.get(key) ?? []), entry]);
    }
    const groups = await Promise.all(
      [...byCountry].map(async ([key, entries]) => {
        const node = await nodeByKey(ctx, key);
        // By year, then sort order, as a grouping's entries are listed.
        entries.sort(
          (a, b) =>
            (a.yearFrom ?? Number.NEGATIVE_INFINITY) -
              (b.yearFrom ?? Number.NEGATIVE_INFINITY) ||
            a.sortOrder - b.sortOrder,
        );
        return {
          key,
          title: node?.title ?? key,
          ...(node &&
            isCountryNode(node) &&
            node.country !== undefined && { country: node.country }),
          entryCount: node?.entryCount ?? 0,
          series: await Promise.all(
            bySeries(entries).map(async (group) => ({
              series: group.titles[0] ?? null,
              entries: await Promise.all(
                group.entries.map(async (entry) =>
                  creditedEntryRow(
                    ctx,
                    entry,
                    await heldCount(ctx, user._id, entry._id),
                  ),
                ),
              ),
            })),
          ),
        };
      }),
    );
    return groups
      .sort(
        (a, b) => b.entryCount - a.entryCount || a.title.localeCompare(b.title),
      )
      .map(({ entryCount, ...group }) => group);
  },
});
