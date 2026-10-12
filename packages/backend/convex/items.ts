import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import {
  moveBetweenAlbums,
  moveManyBetweenAlbums,
  ownAlbumId,
  saleChangedInAlbum,
} from "./albums/membership";
import { heldItemLimit } from "./catalog/browse";
import { setErrors, setLimits } from "./catalog/setRules";
import { setOfEntry, setScope } from "./catalog/sets";
import { countItemAdded, countItemRetyped } from "./collectionCounts";
import { catalogVisibleTo } from "./featureFlags";
import { bulkErrors, bulkLimits } from "./items/bulkRules";
import { entryDetails, overridesOnly } from "./items/catalogFacts";
import { deleteItem } from "./items/deletion";
import { isGrade, scalesFor } from "./items/grades";
import {
  type CatalogEntryLink,
  catalogEntryByKey,
  itemResolver,
  resolveItems,
} from "./items/resolve";
import {
  type ItemInput,
  checkItem,
  checkSale,
  itemErrors,
} from "./items/rules";
import { withThumbnail } from "./items/thumbnail";
import {
  recordIfChanged,
  recordNewItem,
  splitHistory,
} from "./items/valueHistory";
import { requireRoomForItems } from "./plans";
import schema from "./schema";
import { requireSetUpUser } from "./utils/auth";
import {
  catalogDetails,
  catalogItemType,
  grader,
  gradingScale,
  homeCurrency,
  itemType,
  material,
  metal,
  stampCatalogue,
  strike,
} from "./utils/validators";
import { clearWant } from "./wants";

/** Every field a person sets on an Item, as the Item form sends them. */
const itemFields = {
  type: itemType,
  title: v.string(),
  country: v.optional(v.string()),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  category: v.optional(v.string()),
  material: v.optional(material),
  materialNote: v.optional(v.string()),
  mintMark: v.optional(v.string()),
  ruler: v.optional(v.string()),
  mintage: v.optional(v.number()),
  diameter: v.optional(v.number()),
  thickness: v.optional(v.number()),
  numistaNumber: v.optional(v.number()),
  bullion: v.optional(v.boolean()),
  metal: v.optional(metal),
  weight: v.optional(v.number()),
  purity: v.optional(v.number()),
  grade: v.optional(v.string()),
  gradingScale: v.optional(gradingScale),
  gradeNote: v.optional(v.string()),
  strike: v.optional(strike),
  grader: v.optional(grader),
  graderName: v.optional(v.string()),
  certificateNumber: v.optional(v.string()),
  stampCatalogue: v.optional(stampCatalogue),
  stampCatalogueName: v.optional(v.string()),
  stampCatalogueNumber: v.optional(v.string()),
  perforation: v.optional(v.string()),
  watermark: v.optional(v.string()),
  colour: v.optional(v.string()),
  serialNumber: v.optional(v.string()),
  signatures: v.optional(v.string()),
  printer: v.optional(v.string()),
  quantity: v.optional(v.number()),
  purchasePrice: v.optional(v.number()),
  marketValue: v.optional(v.number()),
  purchaseDate: v.optional(v.string()),
  source: v.optional(v.string()),
  notes: v.optional(v.string()),
  albumId: v.optional(v.id("albums")),
};
const fieldNames = Object.keys(itemFields) as Array<keyof typeof itemFields>;

export const itemNotFound = "ITEM_NOT_FOUND";

/** The latest allowed purchase date: tomorrow, so "today" anywhere on Earth is accepted. */
export const latestPurchaseDate = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** One of the signed-in person's Items; anyone else's is reported as not found. */
export async function requireOwnItem(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"items">,
) {
  const owner = await requireSetUpUser(ctx);
  const item = await ctx.db.get(itemId);
  if (!item || item.ownerId !== owner._id) throw new ConvexError(itemNotFound);
  return item;
}

/** A Catalog key that isn't a Catalog entry's: nothing to add an Item from. */
export const catalogEntryNotFound = "CATALOG_ENTRY_NOT_FOUND";

/**
 * The Catalog entry with this key, if the person may see the Catalog: while
 * it's hidden (featureFlags.ts) only admins add from it.
 */
async function visibleCatalogEntry(
  ctx: QueryCtx,
  user: Doc<"users">,
  key: string,
) {
  if (!(await catalogVisibleTo(ctx, user))) return null;
  return await catalogEntryByKey(ctx, key);
}

async function requireCatalogEntry(
  ctx: QueryCtx,
  user: Doc<"users">,
  key: string,
) {
  const entry = await visibleCatalogEntry(ctx, user, key);
  if (!entry) throw new ConvexError(catalogEntryNotFound);
  return entry;
}

/**
 * Checks the form's fields. An Item linked to a Catalog entry has the
 * entry's Item type, and stores only the facts that differ from the entry's
 * (ADR 0001); its weight and purity may rest on the entry's metal. For an
 * edit, `stored` is the Item as it was: facts the form leaves as they were
 * shown keep their stored state.
 */
export function checkFields(
  fields: ItemInput,
  entry: CatalogEntryLink | null,
  stored?: Doc<"items">,
) {
  if (!entry) return checkItem(fields, latestPurchaseDate());
  const checked = checkItem(
    {
      ...fields,
      type: entry.itemType,
      metal: fields.metal ?? entry.facts.metal,
    },
    latestPurchaseDate(),
  );
  return overridesOnly(checked, entry.facts, stored);
}

/**
 * Stores a new Item and keeps the counts that follow Items (its Album's, the
 * Collection's) right. Every way of creating an Item goes through here.
 */
export async function storeNewItem(
  ctx: MutationCtx,
  doc: Omit<Doc<"items">, "_id" | "_creationTime">,
) {
  const itemId = await ctx.db.insert("items", doc);
  await recordNewItem(ctx, itemId, doc);
  await moveBetweenAlbums(
    ctx,
    undefined,
    doc.albumId,
    doc.soldOn !== undefined,
  );
  await countItemAdded(ctx, { ownerId: doc.ownerId, type: doc.type });
  return itemId;
}

/**
 * Stores a new Item in its owner's Collection, and in an Album of theirs if
 * given one. An Item made from a wanted Catalog entry takes it off the
 * Wantlist.
 */
async function insertItem(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  fields: ReturnType<typeof checkFields>,
  entry: CatalogEntryLink | null,
  albumId: Id<"albums"> | undefined,
) {
  const album = await ownAlbumId(ctx, ownerId, albumId);
  const itemId = await storeNewItem(ctx, {
    ownerId,
    ...fields,
    ...(entry && { catalogEntryId: entry._id }),
    ...(album && { albumId: album }),
  });
  if (entry) await clearWant(ctx, ownerId, entry._id);
  return itemId;
}

/**
 * Adds an Item to the signed-in person's Collection: typed in by hand, or
 * picked from the Catalog (`catalogEntryKey`), when it stays linked to its
 * Catalog entry and keeps only the facts the person changed.
 */
export const add = mutation({
  args: { ...itemFields, catalogEntryKey: v.optional(v.string()) },
  returns: v.id("items"),
  handler: async (ctx, { albumId, catalogEntryKey, ...fields }) => {
    const owner = await requireSetUpUser(ctx);
    await requireRoomForItems(ctx, owner._id);
    const entry =
      catalogEntryKey === undefined
        ? null
        : await requireCatalogEntry(ctx, owner, catalogEntryKey);
    return await insertItem(
      ctx,
      owner._id,
      checkFields(fields, entry),
      entry,
      albumId,
    );
  },
});

/**
 * Quick add from a Catalog entry's page: ONE Item, linked to the entry and
 * titled after it, with the Quantity, Grade and Album chosen. Every other
 * fact is the entry's.
 */
export const quickAdd = mutation({
  args: {
    catalogEntryKey: v.string(),
    quantity: v.optional(v.number()),
    grade: v.optional(v.string()),
    gradingScale: v.optional(gradingScale),
    albumId: v.optional(v.id("albums")),
  },
  returns: v.id("items"),
  handler: async (ctx, { catalogEntryKey, albumId, ...chosen }) => {
    const owner = await requireSetUpUser(ctx);
    await requireRoomForItems(ctx, owner._id);
    const entry = await requireCatalogEntry(ctx, owner, catalogEntryKey);
    const fields = checkFields(
      { type: entry.itemType, title: entry.title, ...chosen },
      entry,
    );
    return await insertItem(ctx, owner._id, fields, entry, albumId);
  },
});

/**
 * Adds several Catalog entries at once (spec 6.2's multi-select, and Sets):
 * ONE Item of each, linked to it with a Quantity of 1, in the Album chosen.
 * All or nothing: at most `setLimits.bulkAdd` entries, which must all fit
 * the person's plan, and none of which they already hold unless they allow
 * a duplicate. An entry chosen twice is added once.
 *
 * At the most entries this writes, per entry, the Item, its Album's count and
 * the Collection's counts (600 documents of the 16,000 a mutation may write)
 * and reads about five index ranges (1,000 of 4,096).
 */
export const addCatalogEntries = mutation({
  args: {
    catalogEntryKeys: v.array(v.string()),
    albumId: v.optional(v.id("albums")),
    allowDuplicates: v.optional(v.boolean()),
  },
  returns: v.array(v.id("items")),
  handler: async (ctx, { catalogEntryKeys, albumId, allowDuplicates }) => {
    const owner = await requireSetUpUser(ctx);
    if (catalogEntryKeys.length > setLimits.bulkAdd) {
      throw new ConvexError(setErrors.tooManyEntries);
    }
    const keys = [...new Set(catalogEntryKeys)];
    await requireRoomForItems(ctx, owner._id, keys.length);
    if (keys.length > 0 && !(await catalogVisibleTo(ctx, owner))) {
      throw new ConvexError(catalogEntryNotFound);
    }
    const entries = await Promise.all(
      keys.map(async (key) => {
        const entry = await catalogEntryByKey(ctx, key);
        if (!entry) throw new ConvexError(catalogEntryNotFound);
        return entry;
      }),
    );
    if (!allowDuplicates) {
      const held = await Promise.all(
        entries.map((entry) => holdsAny(ctx, owner._id, entry._id)),
      );
      if (held.some(Boolean)) throw new ConvexError(setErrors.alreadyHeld);
    }
    const itemIds = [];
    for (const entry of entries) {
      const fields = checkFields(
        { type: entry.itemType, title: entry.title },
        entry,
      );
      itemIds.push(await insertItem(ctx, owner._id, fields, entry, albumId));
    }
    return itemIds;
  },
});

/** Whether a person still owns any Item made from a Catalog entry. */
async function holdsAny(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) {
  const item = await ctx.db
    .query("items")
    .withIndex("by_ownerId_and_catalogEntryId_and_soldOn", (q) =>
      q
        .eq("ownerId", ownerId)
        .eq("catalogEntryId", entryId)
        .eq("soldOn", undefined),
    )
    .first();
  return item !== null;
}

/**
 * How many Items made from a Catalog entry a person still owns besides
 * `item`, counting no further than `heldItemLimit`.
 */
async function otherItemsOf(
  ctx: QueryCtx,
  item: Doc<"items">,
  entryId: Id<"catalogNodes">,
) {
  const owned = await ctx.db
    .query("items")
    .withIndex("by_ownerId_and_catalogEntryId_and_soldOn", (q) =>
      q
        .eq("ownerId", item.ownerId)
        .eq("catalogEntryId", entryId)
        .eq("soldOn", undefined),
    )
    .take(heldItemLimit + 1);
  return Math.min(
    heldItemLimit,
    owned.filter((other) => other._id !== item._id).length,
  );
}

/**
 * Saves the whole Item form: a field left empty is cleared. On an Item
 * linked to a Catalog entry, a fact left empty or set to the entry's follows
 * the entry again; only the facts that differ are kept as the person's.
 */
export const update = mutation({
  args: { itemId: v.id("items"), ...itemFields },
  returns: v.null(),
  handler: async (ctx, { itemId, albumId, ...fields }) => {
    const item = await requireOwnItem(ctx, itemId);
    const album = await ownAlbumId(ctx, item.ownerId, albumId);
    const entry = await itemResolver(ctx).entryOf(item);
    const checked = checkFields(fields, entry, item);
    const cleared = Object.fromEntries(
      fieldNames.map((name) => [name, undefined]),
    );
    await ctx.db.patch(itemId, {
      ...cleared,
      ...checked,
      albumId: album,
    });
    await recordIfChanged(ctx, item, checked);
    await moveBetweenAlbums(
      ctx,
      item.albumId,
      album,
      item.soldOn !== undefined,
    );
    await countItemRetyped(ctx, item.ownerId, item.type, checked.type);
    return null;
  },
});

/**
 * Marks one of the signed-in person's Items sold, or changes its sale: the
 * sold-on date, the sale price per piece and a note. Selling fewer pieces
 * than the Item holds (`quantity`) splits them off: a new sold Item copies
 * every field but the photos, and the original keeps the rest, still owned.
 */
export const sell = mutation({
  args: {
    itemId: v.id("items"),
    /** How many pieces; all of them when left out. */
    quantity: v.optional(v.number()),
    soldOn: v.string(),
    salePrice: v.optional(v.number()),
    saleNote: v.optional(v.string()),
  },
  returns: v.id("items"),
  handler: async (ctx, { itemId, quantity, ...input }) => {
    const item = await requireOwnItem(ctx, itemId);
    const sale = checkSale(input, latestPurchaseDate(), item.purchaseDate);
    const pieces = quantity ?? item.quantity;
    if (!Number.isSafeInteger(pieces) || pieces < 1 || pieces > item.quantity)
      throw new ConvexError(itemErrors.invalidQuantity);
    if (pieces === item.quantity) {
      await ctx.db.patch(itemId, sale);
      if (item.soldOn === undefined)
        await saleChangedInAlbum(ctx, item.albumId, true);
      return itemId;
    }
    if (item.soldOn !== undefined)
      throw new ConvexError(itemErrors.invalidQuantity);
    // Photos stay with the original: each stored file is on one Item only.
    const {
      _id,
      _creationTime,
      frontPhoto,
      frontThumbnail,
      backPhoto,
      backThumbnail,
      ...fields
    } = item;
    const soldId = await storeNewItem(ctx, {
      ...fields,
      quantity: pieces,
      ...sale,
      // Its pieces were added with the original's.
      addedAt: item.addedAt ?? _creationTime,
    });
    await ctx.db.patch(itemId, { quantity: item.quantity - pieces });
    await splitHistory(ctx, item, soldId, pieces);
    return soldId;
  },
});

/**
 * Removes the sale from one of the signed-in person's Items: it's owned
 * again, if their plan has room for it.
 */
export const markOwned = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const item = await requireOwnItem(ctx, itemId);
    if (item.soldOn === undefined) return null;
    // Owned again, it counts against the Free plan's limit again.
    await requireRoomForItems(ctx, item.ownerId);
    await ctx.db.patch(itemId, {
      soldOn: undefined,
      salePrice: undefined,
      saleNote: undefined,
    });
    await saleChangedInAlbum(ctx, item.albumId, false);
    return null;
  },
});

/**
 * Moves several of the signed-in person's Items into one of their Albums, or
 * out of any Album. Every Item is checked before anything is written, so the
 * move happens to all of them or to none.
 */
export const moveToAlbum = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    albumId: v.optional(v.id("albums")),
  },
  returns: v.null(),
  handler: async (ctx, { itemIds, albumId }) => {
    const { owner, items } = await requireOwnItems(ctx, itemIds);
    const album = await ownAlbumId(ctx, owner._id, albumId);
    const moving = items.filter((item) => item.albumId !== album);
    for (const item of moving) await ctx.db.patch(item._id, { albumId: album });
    await moveManyBetweenAlbums(
      ctx,
      moving.map((item) => ({
        from: item.albumId,
        to: album,
        sold: item.soldOn !== undefined,
      })),
    );
    return null;
  },
});

/**
 * The signed-in person's Items for a bulk action: each distinct id once, at
 * most `bulkLimits.items` of them, and every one theirs. Throws before the
 * caller writes anything, so a bulk action happens to all of them or none.
 */
async function requireOwnItems(
  ctx: QueryCtx | MutationCtx,
  itemIds: readonly Id<"items">[],
) {
  const owner = await requireSetUpUser(ctx);
  const ids = [...new Set(itemIds)];
  if (ids.length > bulkLimits.items)
    throw new ConvexError(bulkErrors.tooManyItems);
  const items = await Promise.all(
    ids.map(async (id) => {
      const item = await ctx.db.get(id);
      if (!item || item.ownerId !== owner._id)
        throw new ConvexError(itemNotFound);
      return item;
    }),
  );
  return { owner, items };
}

/**
 * Sets one Grade on several of the signed-in person's Items: those whose Item
 * type the Grading scale suits; the others are skipped and counted. Grade
 * notes stay as they are. Every Item is checked before anything is written.
 */
export const setGrade = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    gradingScale,
    grade: v.string(),
  },
  returns: v.object({ graded: v.number(), skipped: v.number() }),
  handler: async (ctx, { itemIds, gradingScale, grade }) => {
    if (!isGrade(gradingScale, grade))
      throw new ConvexError(itemErrors.invalidGrade);
    const { items } = await requireOwnItems(ctx, itemIds);
    const grading = items.filter((item) =>
      scalesFor(item.type).includes(gradingScale),
    );
    for (const item of grading)
      await ctx.db.patch(item._id, { gradingScale, grade });
    return { graded: grading.length, skipped: items.length - grading.length };
  },
});

/**
 * How many photos deleting these Items takes with them (both sides and the
 * more photos), for the confirmation. Items that are gone count nothing.
 */
export const photoCount = query({
  args: { itemIds: v.array(v.id("items")) },
  returns: v.number(),
  handler: async (ctx, { itemIds }) => {
    const owner = await requireSetUpUser(ctx);
    let count = 0;
    for (const id of new Set(itemIds.slice(0, bulkLimits.items))) {
      const item = await ctx.db.get(id);
      if (!item || item.ownerId !== owner._id) continue;
      if (item.frontPhoto) count += 1;
      if (item.backPhoto) count += 1;
      const more = await ctx.db
        .query("itemPhotos")
        .withIndex("by_itemId", (q) => q.eq("itemId", id))
        .collect();
      count += more.length;
    }
    return count;
  },
});

/**
 * Deletes several of the signed-in person's Items, and their photos, for
 * good, each the way one Item is deleted. Every Item is checked before
 * anything is deleted, so all of them go or none.
 */
export const removeMany = mutation({
  args: { itemIds: v.array(v.id("items")) },
  returns: v.null(),
  handler: async (ctx, { itemIds }) => {
    const { items } = await requireOwnItems(ctx, itemIds);
    for (const item of items) await deleteItem(ctx, item);
    return null;
  },
});

/** Deletes one of the signed-in person's Items, and its photos, for good. */
export const remove = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    await deleteItem(ctx, await requireOwnItem(ctx, itemId));
    return null;
  },
});

/** A Catalog entry's facts in Item terms (items/catalogFacts.ts). */
const catalogFacts = v.object({
  country: v.optional(v.string()),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  material: v.optional(material),
  strike: v.optional(strike),
  diameter: v.optional(v.number()),
  thickness: v.optional(v.number()),
  mintMark: v.optional(v.string()),
  mintage: v.optional(v.number()),
  numistaNumber: v.optional(v.number()),
  metal: v.optional(metal),
  weight: v.optional(v.number()),
  purity: v.optional(v.number()),
});

const listedItem = schema
  .doc("items")
  .extend({ thumbnailUrl: v.union(v.string(), v.null()) });

/**
 * The signed-in person's Items, newest first, a page at a time, their facts
 * resolved. Each comes with its thumbnail (items/thumbnail.ts): the small
 * copy of the front photo, else of the back photo, else of the first more
 * photo, else null.
 */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(listedItem),
  handler: async (ctx, { paginationOpts }) => {
    const owner = await requireSetUpUser(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...items,
      page: await Promise.all(
        (await resolveItems(ctx, items.page)).map((item) =>
          withThumbnail(ctx, item),
        ),
      ),
    };
  },
});

/**
 * One of the signed-in person's Items, its facts resolved, with the currency
 * its amounts are in and the Catalog entry it's linked to (null for one
 * added by hand); null if it isn't theirs.
 */
export const get = query({
  args: { itemId: v.string() },
  returns: v.union(
    v.null(),
    schema.doc("items").extend({
      currency: homeCurrency,
      catalogEntry: v.union(
        v.null(),
        v.object({
          key: v.string(),
          title: v.string(),
          facts: catalogFacts,
          details: catalogDetails,
          /**
           * How many other Items made from the entry the person still owns,
           * counting no further than `heldItemLimit`.
           */
          otherItems: v.number(),
          /** The Set "View as Set" opens (catalog/sets.ts setOfEntry); null for none. */
          set: v.union(v.null(), setScope),
        }),
      ),
    }),
  ),
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const id = ctx.db.normalizeId("items", itemId);
    const item = id ? await ctx.db.get(id) : null;
    if (!item || item.ownerId !== owner._id) return null;
    const resolver = itemResolver(ctx);
    const entry = await resolver.entryOf(item);
    // Only the Item page shows these, so only this read looks them up.
    const node = entry && (await ctx.db.get(entry._id));
    return {
      ...(await resolver.resolve(item)),
      currency: owner.homeCurrency,
      catalogEntry: entry && {
        key: entry.key,
        title: entry.title,
        facts: entry.facts,
        details: entryDetails(node ?? {}),
        otherItems: await otherItemsOf(ctx, item, entry._id),
        // Sets are part of the Catalog, so hidden with it.
        set:
          node && (await catalogVisibleTo(ctx, owner))
            ? await setOfEntry(ctx, node)
            : null,
      },
    };
  },
});

/**
 * A Catalog entry as the Item form takes it when the person picks it: its
 * title, Item type and facts in Item terms. Null for any other key, and
 * while the Catalog is hidden from the person.
 */
export const catalogEntry = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      title: v.string(),
      itemType: catalogItemType,
      facts: catalogFacts,
    }),
  ),
  handler: async (ctx, { key }) => {
    const user = await requireSetUpUser(ctx);
    const entry = await visibleCatalogEntry(ctx, user, key);
    if (!entry) return null;
    const { _id, ...link } = entry;
    return link;
  },
});
