import {
  type PaginationResult,
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { catalogVisibleTo } from "../featureFlags";
import { compareDenominations } from "../items/denominations";
import { requireSetUpUser } from "../utils/auth";
import {
  catalogItemType,
  material,
  preciousMetal,
  provenance,
  strike,
} from "../utils/validators";
import { creditRequired } from "./imageRules";

/**
 * Browsing the Catalog: countries and Themes, down through grouping nodes or
 * denomination → series, to the Catalog entries, each with how many of it the
 * person holds. Every level is addressed by node keys (stable across
 * deployments), so each has its own URL.
 */

/** More roots, or groupings below one node, than this is not a Catalog anyone browses. */
const rootLimit = 1000;
const groupingLimit = 1000;
/** Denominations in a country, and series in a denomination, read at most. */
const distinctLimit = 500;

const groupRow = v.object({
  key: v.string(),
  kind: v.union(
    v.literal("country"),
    v.literal("theme"),
    v.literal("grouping"),
  ),
  title: v.string(),
  country: v.optional(v.string()),
  entryCount: v.number(),
});

type GroupNode = Doc<"catalogNodes"> & {
  kind: "country" | "theme" | "grouping";
};

const groupRowOf = (node: GroupNode) => ({
  key: node.key,
  kind: node.kind,
  title: node.title,
  ...(node.country !== undefined && { country: node.country }),
  entryCount: node.entryCount ?? 0,
});

/** Most entries first; equal counts by title. */
const byEntryCount = (
  a: { entryCount: number; title: string },
  b: { entryCount: number; title: string },
) => b.entryCount - a.entryCount || a.title.localeCompare(b.title);

/**
 * The set-up person browsing, or null while the Catalog is hidden from them
 * (the Catalog visibility flag, featureFlags.ts): then every level reads as
 * empty, as if there were no Catalog.
 */
async function browsingUser(ctx: QueryCtx) {
  const user = await requireSetUpUser(ctx);
  return (await catalogVisibleTo(ctx, user)) ? user : null;
}

/** The countries and Themes at the top of the Catalog, with their entry counts, most entries first. */
export const roots = query({
  args: {},
  returns: v.array(groupRow),
  handler: async (ctx) => {
    if (!(await browsingUser(ctx))) return [];
    const nodes = await ctx.db
      .query("catalogNodes")
      .withIndex("by_parentId_and_sortOrder", (q) =>
        q.eq("parentId", undefined),
      )
      .take(rootLimit);
    return nodes
      .map((node) => groupRowOf(node as GroupNode))
      .sort(byEntryCount);
  },
});

/** How many pieces of a Catalog entry a person holds: the Quantity of every Item made from it. */
export async function heldCount(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) {
  let held = 0;
  for await (const item of ctx.db
    .query("items")
    .withIndex("by_ownerId_and_catalogEntryId", (q) =>
      q.eq("ownerId", ownerId).eq("catalogEntryId", entryId),
    )) {
    held += item.quantity;
  }
  return held;
}

async function nodeByKey(ctx: QueryCtx, key: string) {
  return await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

/** The nodes above one, root first, for the breadcrumb. */
async function ancestorsOf(ctx: QueryCtx, node: Doc<"catalogNodes">) {
  const keys = node.path.split("/").slice(0, -1);
  const ancestors = [];
  for (const key of keys) {
    const ancestor = await nodeByKey(ctx, key);
    if (ancestor) ancestors.push({ key: ancestor.key, title: ancestor.title });
  }
  return ancestors;
}

const ancestor = v.object({ key: v.string(), title: v.string() });

/** A Catalog entry with everything its detail view shows. */
const entryFields = {
  key: v.string(),
  title: v.string(),
  itemType: v.optional(catalogItemType),
  country: v.optional(v.string()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  material: v.optional(material),
  strike: v.optional(strike),
  metal: v.optional(preciousMetal),
  weight: v.optional(v.number()),
  fineness: v.optional(v.number()),
  diameter: v.optional(v.number()),
  yearFrom: v.optional(v.number()),
  yearTo: v.optional(v.number()),
  /** The image at full size: an uploaded one, else one linked from a CSV file. */
  imageUrl: v.optional(v.string()),
  /** The image at thumbnail size, for rows; a linked image has only one size. */
  thumbnailUrl: v.optional(v.string()),
  /** How many pieces of it the person holds. */
  held: v.number(),
};

const entryDetail = v.object({
  ...entryFields,
  kind: v.literal("entry"),
  technicalDetails: v.optional(v.string()),
  historicalNotes: v.optional(v.string()),
  factsProvenance: v.optional(provenance),
  notesProvenance: v.optional(provenance),
  imageProvenance: v.optional(provenance),
  numistaId: v.optional(v.number()),
  ancestors: v.array(ancestor),
});

const groupDetail = v.object({
  ...groupRow.fields,
  ancestors: v.array(ancestor),
  /** The grouping nodes right below: a Theme's countries, most entries first; elsewhere in sort order. */
  groupings: v.array(groupRow),
  /** Whether it is a country (a country root, or a Theme's country), so it can be browsed by denomination. */
  countryNode: v.boolean(),
});

/** The facts an entry row shows. */
const rowFieldNames = [
  "itemType",
  "country",
  "denomination",
  "series",
  "material",
  "strike",
  "metal",
  "weight",
  "fineness",
  "diameter",
  "yearFrom",
  "yearTo",
] as const;

/** What only an entry's detail view shows. */
const detailFieldNames = [
  "technicalDetails",
  "historicalNotes",
  "factsProvenance",
  "notesProvenance",
  "imageProvenance",
  "numistaId",
] as const;

/** The fields of `source` named by `keys` that have a value. */
function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
) {
  const picked: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

/** Links to an entry's image at both sizes, if it has one. */
async function imageOf(ctx: QueryCtx, node: Doc<"catalogNodes">) {
  if (node.imageFiles) {
    const imageUrl = await ctx.storage.getUrl(node.imageFiles.full);
    const thumbnailUrl = await ctx.storage.getUrl(node.imageFiles.thumbnail);
    return {
      ...(imageUrl && { imageUrl }),
      ...(thumbnailUrl && { thumbnailUrl }),
    };
  }
  if (node.imageUrl)
    return { imageUrl: node.imageUrl, thumbnailUrl: node.imageUrl };
  return {};
}

/** An entry as a row of a list, with how many the person holds. */
const entryRowOf = async (
  ctx: QueryCtx,
  node: Doc<"catalogNodes">,
  held: number,
) => ({
  key: node.key,
  title: node.title,
  ...pick(node, rowFieldNames),
  ...(await imageOf(ctx, node)),
  held,
});

/**
 * One level of the Catalog by its key: a Catalog entry with its full detail
 * and how many the person holds, or a country, Theme or grouping with the
 * groupings right below it. Null when no node has the key.
 */
export const node = query({
  args: { key: v.string() },
  returns: v.union(v.null(), entryDetail, groupDetail),
  handler: async (ctx, { key }) => {
    const user = await browsingUser(ctx);
    if (!user) return null;
    const node = await nodeByKey(ctx, key);
    if (!node) return null;
    const ancestors = await ancestorsOf(ctx, node);

    if (node.kind === "entry") {
      return {
        ...(await entryRowOf(
          ctx,
          node,
          await heldCount(ctx, user._id, node._id),
        )),
        kind: "entry" as const,
        ...pick(node, detailFieldNames),
        ancestors,
      };
    }

    const groupings = (
      await ctx.db
        .query("catalogNodes")
        .withIndex("by_parentId_and_kind_and_yearFrom_and_sortOrder", (q) =>
          q.eq("parentId", node._id).eq("kind", "grouping"),
        )
        .take(groupingLimit)
    )
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      )
      .map((child) => groupRowOf(child as GroupNode));
    return {
      ...groupRowOf(node as GroupNode),
      ancestors,
      groupings:
        node.kind === "theme" ? groupings.sort(byEntryCount) : groupings,
      countryNode: node.countryNodeKey === node.key,
    };
  },
});

const entryRow = v.object({
  ...entryFields,
  /** Who to credit beside the thumbnail, when the image's licence asks for it. */
  imageCredit: v.optional(provenance),
});
type EntryRow = typeof entryRow.type;

/** A page of Catalog entries as rows, with how many of each the person holds. */
async function entryRows(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  page: PaginationResult<Doc<"catalogNodes">>,
): Promise<PaginationResult<EntryRow>> {
  const rows = await Promise.all(
    page.page.map(async (node) => {
      const row = await entryRowOf(
        ctx,
        node,
        await heldCount(ctx, ownerId, node._id),
      );
      const credit = node.imageProvenance;
      return row.thumbnailUrl && credit && creditRequired(credit.licence)
        ? { ...row, imageCredit: credit }
        : row;
    }),
  );
  return { ...page, page: rows };
}

const noEntries: PaginationResult<EntryRow> = {
  page: [],
  isDone: true,
  continueCursor: "",
};

/** The Catalog entries right below a node, by year, then sort order. */
export const entries = query({
  args: { key: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(entryRow),
  handler: async (ctx, { key, paginationOpts }) => {
    const user = await browsingUser(ctx);
    if (!user) return noEntries;
    const parent = await nodeByKey(ctx, key);
    if (!parent) return noEntries;
    const page = await ctx.db
      .query("catalogNodes")
      .withIndex("by_parentId_and_kind_and_yearFrom_and_sortOrder", (q) =>
        q.eq("parentId", parent._id).eq("kind", "entry"),
      )
      .paginate(paginationOpts);
    return await entryRows(ctx, user._id, page);
  },
});

/**
 * The denomination path: within a country (a country root, or a Theme's
 * country), its entries by denomination, then series. Entries without one
 * are grouped as null. Both levels read one entry per distinct value from the
 * index, so they cost as many reads as there are groups, not entries.
 */
const byDenomination =
  "by_kind_countryNodeKey_denomination_series_yearFrom_sortOrder";

/** "No denomination" and "no series" travel as null; stored, they are absent. */
const nullable = v.union(v.string(), v.null());
const stored = (value: string | null) => value ?? undefined;

/** The distinct denominations among a country's entries, in index order. */
async function denominationsIn(ctx: QueryCtx, countryNodeKey: string) {
  const found: Array<string | undefined> = [];
  while (found.length < distinctLimit) {
    const last = found.at(-1);
    const started = found.length > 0;
    const next = await ctx.db
      .query("catalogNodes")
      .withIndex(byDenomination, (q) => {
        const country = q
          .eq("kind", "entry")
          .eq("countryNodeKey", countryNodeKey);
        return started ? country.gt("denomination", last) : country;
      })
      .first();
    if (!next) break;
    found.push(next.denomination);
  }
  return found;
}

/** The distinct series among a country's entries of one denomination, in index order. */
async function seriesIn(
  ctx: QueryCtx,
  countryNodeKey: string,
  denomination: string | undefined,
) {
  const found: Array<string | undefined> = [];
  while (found.length < distinctLimit) {
    const last = found.at(-1);
    const started = found.length > 0;
    const next = await ctx.db
      .query("catalogNodes")
      .withIndex(byDenomination, (q) => {
        const denominationEntries = q
          .eq("kind", "entry")
          .eq("countryNodeKey", countryNodeKey)
          .eq("denomination", denomination);
        return started
          ? denominationEntries.gt("series", last)
          : denominationEntries;
      })
      .first();
    if (!next) break;
    found.push(next.series);
  }
  return found;
}

/** A country's denominations by face value, smallest first, then entries without one. */
export const denominations = query({
  args: { key: v.string() },
  returns: v.array(
    v.object({ denomination: nullable, seriesCount: v.number() }),
  ),
  handler: async (ctx, { key }) => {
    if (!(await browsingUser(ctx))) return [];
    const rows = [];
    for (const denomination of await denominationsIn(ctx, key)) {
      rows.push({
        denomination: denomination ?? null,
        seriesCount: (await seriesIn(ctx, key, denomination)).length,
      });
    }
    return rows.sort((a, b) =>
      compareDenominations(stored(a.denomination), stored(b.denomination)),
    );
  },
});

/**
 * The series of one denomination in a country, by first year (series without
 * years after the rest), then entries without a series.
 */
export const series = query({
  args: { key: v.string(), denomination: nullable },
  returns: v.array(
    v.object({
      series: nullable,
      firstYear: v.optional(v.number()),
      lastYear: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { key, denomination }) => {
    if (!(await browsingUser(ctx))) return [];
    const rows = [];
    for (const series of await seriesIn(ctx, key, stored(denomination))) {
      const entries = () =>
        ctx.db
          .query("catalogNodes")
          .withIndex(byDenomination, (q) =>
            q
              .eq("kind", "entry")
              .eq("countryNodeKey", key)
              .eq("denomination", stored(denomination))
              .eq("series", series)
              .gt("yearFrom", undefined),
          );
      const first = await entries().first();
      const last = await entries().order("desc").first();
      rows.push({
        series: series ?? null,
        ...(first?.yearFrom !== undefined && { firstYear: first.yearFrom }),
        ...(last?.yearFrom !== undefined && {
          lastYear: last.yearTo ?? last.yearFrom,
        }),
      });
    }
    const lastIf = (missing: boolean) => (missing ? 1 : 0);
    return rows.sort(
      (a, b) =>
        lastIf(a.series === null) - lastIf(b.series === null) ||
        lastIf(a.firstYear === undefined) - lastIf(b.firstYear === undefined) ||
        (a.firstYear ?? 0) - (b.firstYear ?? 0) ||
        (a.series ?? "").localeCompare(b.series ?? ""),
    );
  },
});

/** The Catalog entries of one series of a denomination in a country, by year, then sort order. */
export const seriesEntries = query({
  args: {
    key: v.string(),
    denomination: nullable,
    series: nullable,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(entryRow),
  handler: async (ctx, { key, denomination, series, paginationOpts }) => {
    const user = await browsingUser(ctx);
    if (!user) return noEntries;
    const page = await ctx.db
      .query("catalogNodes")
      .withIndex(byDenomination, (q) =>
        q
          .eq("kind", "entry")
          .eq("countryNodeKey", key)
          .eq("denomination", stored(denomination))
          .eq("series", stored(series)),
      )
      .paginate(paginationOpts);
    return await entryRows(ctx, user._id, page);
  },
});
