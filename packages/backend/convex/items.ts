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
import {
  changingHomeCurrency,
  checkAmountsWrite,
  holdsAmount,
  homeCurrencyErrors,
} from "./homeCurrency/rules";
import {
  bulkErrors,
  bulkLimits,
  planGradeUndo,
  planMoveUndo,
  planPurchaseUndo,
  purchasePatch,
} from "./items/bulkRules";
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
  historyOf,
  recordIfChanged,
  recordNewItem,
  splitHistory,
} from "./items/valueHistory";
import { requireRoomForItems } from "./plans";
import schema from "./schema";
import { requireSetUpUser } from "./utils/auth";
import { capped } from "./utils/pagination";
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

/**
 * The Home currency a form showed its amounts in. Amounts entered in one the
 * person no longer has (it changed while the form was open) are turned away
 * rather than stored unconverted. Older apps don't send it.
 */
const amountsIn = v.optional(homeCurrency);

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
  args: { ...itemFields, catalogEntryKey: v.optional(v.string()), amountsIn },
  returns: v.id("items"),
  handler: async (ctx, { albumId, catalogEntryKey, amountsIn, ...fields }) => {
    const owner = await requireSetUpUser(ctx);
    if (holdsAmount(fields)) checkAmountsWrite(owner, amountsIn);
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
  args: { itemId: v.id("items"), ...itemFields, amountsIn },
  returns: v.null(),
  handler: async (ctx, { itemId, albumId, amountsIn, ...fields }) => {
    const item = await requireOwnItem(ctx, itemId);
    const album = await ownAlbumId(ctx, item.ownerId, albumId);
    const entry = await itemResolver(ctx).entryOf(item);
    const checked = checkFields(fields, entry, item);
    // The form sends its amounts each time; only amounts that differ from
    // the stored ones are written.
    if (
      checked.purchasePrice !== item.purchasePrice ||
      checked.marketValue !== item.marketValue
    )
      checkAmountsWrite(await requireSetUpUser(ctx), amountsIn);
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
    amountsIn,
  },
  returns: v.id("items"),
  handler: async (ctx, { itemId, quantity, amountsIn, ...input }) => {
    const item = await requireOwnItem(ctx, itemId);
    const owner = await requireSetUpUser(ctx);
    const sale = checkSale(input, latestPurchaseDate(), item.purchaseDate);
    if (sale.salePrice !== undefined && sale.salePrice !== item.salePrice)
      checkAmountsWrite(owner, amountsIn);
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
    // The split-off Item gets copies of the amounts and their history: made
    // while a change converts in the background, they could be converted
    // twice.
    if (
      changingHomeCurrency(owner) &&
      (holdsAmount(item) || (await historyOf(ctx, itemId)).some(holdsAmount))
    )
      throw new ConvexError(homeCurrencyErrors.changing);
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

/** An Item a move took, with the Album it was in before: what undoing it needs. */
const movedItem = v.object({
  itemId: v.id("items"),
  albumId: v.optional(v.id("albums")),
});

/** An Item a bulk grading set, with the Grade it had before: what undoing it needs. */
const gradedItem = v.object({
  itemId: v.id("items"),
  gradingScale: v.optional(gradingScale),
  grade: v.optional(v.string()),
});

/** An Item's purchase as Set purchase takes it: Purchase price per piece, purchase date and source. */
const purchase = {
  purchasePrice: v.optional(v.number()),
  purchaseDate: v.optional(v.string()),
  source: v.optional(v.string()),
};

/** An Item Set purchase was set on, with the purchase it had before: what undoing it needs. */
const purchasedItem = v.object({ itemId: v.id("items"), ...purchase });

/** How an undo went: Items put back, and Items skipped as changed since. */
const undone = v.object({ restored: v.number(), skipped: v.number() });

/**
 * Moves several of the signed-in person's Items into one of their Albums, or
 * out of any Album. Every Item is checked before anything is written, so the
 * move happens to all of them or to none. Returns the Items it moved with the
 * Album each was in, for `undoMove`.
 */
export const moveToAlbum = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    albumId: v.optional(v.id("albums")),
  },
  returns: v.object({ before: v.array(movedItem) }),
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
    return {
      before: moving.map((item) => ({
        itemId: item._id,
        albumId: item.albumId,
      })),
    };
  },
});

/**
 * Undoes `moveToAlbum`: puts each Item it moved (`before`) back in the Album
 * it was in, or in none, if it's still in the Album it was moved to
 * (`albumId`) and that Album still exists (items/bulkRules.ts). The others are
 * skipped and counted.
 */
export const undoMove = mutation({
  args: {
    before: v.array(movedItem),
    albumId: v.optional(v.id("albums")),
  },
  returns: undone,
  handler: async (ctx, { before, albumId }) => {
    const owner = await requireSetUpUser(ctx);
    const now = await ownItemsNow(ctx, owner._id, before);
    const albums = new Set<Id<"albums">>();
    for (const id of new Set(before.flatMap((item) => item.albumId ?? []))) {
      const album = await ctx.db.get("albums", id);
      if (album?.ownerId === owner._id) albums.add(id);
    }
    const { restore, skipped } = planMoveUndo({
      before,
      after: { albumId },
      now,
      albums,
    });
    for (const { itemId, albumId: to } of restore)
      await ctx.db.patch("items", itemId, { albumId: to });
    await moveManyBetweenAlbums(
      ctx,
      restore.map(({ itemId, albumId: to }) => {
        const item = now.get(itemId)!;
        return { from: item.albumId, to, sold: item.soldOn !== undefined };
      }),
    );
    return { restored: restore.length, skipped };
  },
});

/**
 * The signed-in person's Items an undo names, as they are now, by id; one
 * deleted since, or not theirs, is left out. At most `bulkLimits.items`, as
 * many as the action it undoes took.
 */
async function ownItemsNow(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  before: ReadonlyArray<{ itemId: Id<"items"> }>,
) {
  if (before.length > bulkLimits.items)
    throw new ConvexError(bulkErrors.tooManyItems);
  const items = await Promise.all(
    before.map(({ itemId }) => ctx.db.get("items", itemId)),
  );
  return new Map(
    items.flatMap((item) =>
      item?.ownerId === ownerId ? [[item._id, item] as const] : [],
    ),
  );
}

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
 * Returns the Items it graded with the Grade and Grading scale each had, for
 * `undoGrade`.
 */
export const setGrade = mutation({
  args: {
    itemIds: v.array(v.id("items")),
    gradingScale,
    grade: v.string(),
  },
  returns: v.object({
    graded: v.number(),
    skipped: v.number(),
    before: v.array(gradedItem),
  }),
  handler: async (ctx, { itemIds, gradingScale, grade }) => {
    if (!isGrade(gradingScale, grade))
      throw new ConvexError(itemErrors.invalidGrade);
    const { items } = await requireOwnItems(ctx, itemIds);
    const grading = items.filter((item) =>
      scalesFor(item.type).includes(gradingScale),
    );
    for (const item of grading)
      await ctx.db.patch(item._id, { gradingScale, grade });
    return {
      graded: grading.length,
      skipped: items.length - grading.length,
      before: grading.map((item) => ({
        itemId: item._id,
        gradingScale: item.gradingScale,
        grade: item.grade,
      })),
    };
  },
});

/**
 * Undoes `setGrade`: gives each Item it graded (`before`) the Grade and
 * Grading scale it had, or no Grade, if it still has the Grade that was set
 * and its own still suits its Item type (items/bulkRules.ts). The others are
 * skipped and counted.
 */
export const undoGrade = mutation({
  args: {
    before: v.array(gradedItem),
    gradingScale,
    grade: v.string(),
  },
  returns: undone,
  handler: async (ctx, { before, gradingScale, grade }) => {
    const owner = await requireSetUpUser(ctx);
    const now = await ownItemsNow(ctx, owner._id, before);
    const { restore, skipped } = planGradeUndo({
      before,
      after: { gradingScale, grade },
      now,
    });
    for (const { itemId, gradingScale, grade } of restore)
      await ctx.db.patch("items", itemId, { gradingScale, grade });
    return { restored: restore.length, skipped };
  },
});

/**
 * Sets a bought lot's purchase on several of the signed-in person's Items:
 * the Purchase price per piece, purchase date and source filled in, checked
 * as the Item form checks them, while a field left empty keeps each Item's
 * own (items/bulkRules.ts). Market value and Quantity stay as they are, so
 * there's no Market value history to record. Every Item is checked before
 * anything is written. Returns the purchase as set and the purchase each
 * Item had, for `undoPurchase`.
 */
export const setPurchase = mutation({
  args: { itemIds: v.array(v.id("items")), ...purchase },
  returns: v.object({
    set: v.object(purchase),
    before: v.array(purchasedItem),
  }),
  handler: async (ctx, { itemIds, ...input }) => {
    const set = purchasePatch(input, latestPurchaseDate());
    const { items } = await requireOwnItems(ctx, itemIds);
    for (const item of items) await ctx.db.patch("items", item._id, set);
    return {
      set,
      before: items.map((item) => ({
        itemId: item._id,
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate,
        source: item.source,
      })),
    };
  },
});

/**
 * Undoes `setPurchase`: gives each Item it was set on (`before`) its own
 * value back, or none, for each field the purchase set (`set`), if the Item
 * still holds the values set and the Item form would store its own as they
 * are (items/bulkRules.ts). The others are skipped and counted.
 */
export const undoPurchase = mutation({
  args: { before: v.array(purchasedItem), set: v.object(purchase) },
  returns: undone,
  handler: async (ctx, { before, set }) => {
    const owner = await requireSetUpUser(ctx);
    const now = await ownItemsNow(ctx, owner._id, before);
    const { restore, skipped } = planPurchaseUndo({
      before,
      after: set,
      now,
      today: latestPurchaseDate(),
    });
    for (const { itemId, ...was } of restore)
      await ctx.db.patch("items", itemId, was);
    return { restored: restore.length, skipped };
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
 * The most Items one page of an Item list (`list`, albums.items) holds,
 * however many the app asks for; it asks for 25 or 50.
 */
export const ITEM_LIST_PAGE_SIZE = 100;

/**
 * The signed-in person's Items, newest first, a page at a time (up to
 * ITEM_LIST_PAGE_SIZE), their facts resolved. Each comes with its thumbnail (items/thumbnail.ts): the small
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
      .paginate(capped(paginationOpts, { numItems: ITEM_LIST_PAGE_SIZE }));
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
