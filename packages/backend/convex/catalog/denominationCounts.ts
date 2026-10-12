import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
} from "../_generated/server";
import { byDenomination } from "./browse";
import { setLimits } from "./setRules";

/**
 * How many Catalog entries each country holds of one denomination and one
 * series of it, as its denomination path groups them (catalog/browse.ts):
 * the Set "View as Set" opens for an entry right below a country
 * (catalog/sets.ts setOfEntry), so the Item page reads one count instead
 * of the entries. Every write to the tree (catalog/tree.ts) gathers how its
 * entries join and leave these groups and stores the counts once at the
 * end. A count goes no higher than one past the most entries a Set may
 * have: past that it only says the group is too large to be a Set, so no
 * count ever reads more entries than viewing a Set would.
 */

/** A country's entries of one denomination and series; undefined is "none", as stored. */
export type DenominationGroup = {
  countryNodeKey: string;
  denomination: string | undefined;
  series: string | undefined;
};

/** What a stored count says for any group with more entries than a Set may have. */
const tooLarge = setLimits.entries + 1;

type Counted = Pick<
  Doc<"catalogNodes">,
  "kind" | "countryNodeKey" | "denomination" | "series"
>;

/** The group an entry counts toward; null for groupings, and entries outside any country. */
function groupOf(node: Counted): DenominationGroup | null {
  if (node.kind !== "entry" || node.countryNodeKey === undefined) return null;
  return {
    countryNodeKey: node.countryNodeKey,
    denomination: node.denomination,
    series: node.series,
  };
}

const idOf = (group: DenominationGroup) =>
  JSON.stringify([
    group.countryNodeKey,
    group.denomination ?? null,
    group.series ?? null,
  ]);

const countOf = (ctx: QueryCtx, group: DenominationGroup) =>
  ctx.db
    .query("catalogDenominationCounts")
    .withIndex("by_countryNodeKey_and_denomination_and_series", (q) =>
      q
        .eq("countryNodeKey", group.countryNodeKey)
        .eq("denomination", group.denomination)
        .eq("series", group.series),
    )
    .unique();

/**
 * How many entries a group has, as stored (`tooLarge` for any more than a
 * Set may have); null while it isn't counted yet.
 */
export async function storedDenominationCount(
  ctx: QueryCtx,
  group: DenominationGroup,
) {
  return (await countOf(ctx, group))?.entryCount ?? null;
}

/** Counts a group's entries afresh through their index, up to `tooLarge`, and stores that. */
async function recount(ctx: MutationCtx, group: DenominationGroup) {
  const entryCount = (
    await ctx.db
      .query("catalogNodes")
      .withIndex(byDenomination, (q) =>
        q
          .eq("kind", "entry")
          .eq("countryNodeKey", group.countryNodeKey)
          .eq("denomination", group.denomination)
          .eq("series", group.series),
      )
      .take(tooLarge)
  ).length;
  const stored = await countOf(ctx, group);
  if (!stored) {
    if (entryCount > 0)
      await ctx.db.insert("catalogDenominationCounts", {
        ...group,
        entryCount,
      });
  } else if (entryCount === 0) {
    await ctx.db.delete("catalogDenominationCounts", stored._id);
  } else if (stored.entryCount !== entryCount) {
    await ctx.db.patch("catalogDenominationCounts", stored._id, {
      entryCount,
    });
  }
}

/**
 * Gathers how a write's entries join and leave groups, then stores the new
 * counts once. A group is counted afresh instead, after the write, when it
 * isn't counted yet (before the backfill) or loses entries while counted
 * as too large, as only then is its stored count no help.
 */
export function denominationCountChanges() {
  const changes = new Map<
    string,
    { group: DenominationGroup; change: number }
  >();
  return {
    /** An entry joins (1) or leaves (-1) its group; other nodes count toward none. */
    count(node: Counted, change: 1 | -1) {
      const group = groupOf(node);
      if (!group) return;
      const id = idOf(group);
      changes.set(id, {
        group,
        change: (changes.get(id)?.change ?? 0) + change,
      });
    },
    async store(ctx: MutationCtx) {
      for (const { group, change } of changes.values()) {
        if (change === 0) continue;
        const stored = await countOf(ctx, group);
        if (stored && stored.entryCount >= tooLarge && change > 0) continue;
        const entryCount = stored ? stored.entryCount + change : 0;
        if (stored && stored.entryCount < tooLarge && entryCount > 0) {
          await ctx.db.patch("catalogDenominationCounts", stored._id, {
            entryCount: Math.min(entryCount, tooLarge),
          });
        } else {
          await recount(ctx, group);
        }
      }
    },
  };
}

/**
 * Entries one backfill batch reads. Of the groups it meets, all but the
 * last end within the batch, and the last is counted up to `tooLarge`, so
 * a batch reads at most twice this many entries plus `tooLarge`, well
 * within a transaction's limits.
 */
const backfillBatch = 50;

/**
 * The one-off backfill for Catalog data from before these groups were
 * counted: works through every entry in denomination-path order a batch at
 * a time, each batch scheduling the next, and counts each group afresh
 * where it first meets it. Running it again changes nothing. Run once per
 * deployment: `npx convex run catalog/denominationCounts:backfill` (add
 * `--prod` for production).
 */
export const backfill = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    /** The group the batch before counted last, which this one may go on with. */
    counted: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { cursor, counted }) => {
    const entries = await ctx.db
      .query("catalogNodes")
      .withIndex(byDenomination, (q) => q.eq("kind", "entry"))
      .paginate({ cursor: cursor ?? null, numItems: backfillBatch });
    let last = counted;
    for (const entry of entries.page) {
      const group = groupOf(entry);
      if (!group || idOf(group) === last) continue;
      await recount(ctx, group);
      last = idOf(group);
    }
    if (!entries.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.catalog.denominationCounts.backfill,
        { cursor: entries.continueCursor, counted: last },
      );
    return null;
  },
});
