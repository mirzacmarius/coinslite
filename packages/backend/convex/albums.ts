import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { ownedItemCount } from "./albums/membership";
import {
  albumErrors,
  albumLimits,
  checkAlbum,
  nextColour,
} from "./albums/rules";
import { countAlbumCreated, countAlbumDeleted } from "./collectionCounts";
import { ITEM_LIST_PAGE_SIZE, itemNotFound } from "./items";
import { deleteItem } from "./items/deletion";
import { resolveItems } from "./items/resolve";
import { withThumbnail } from "./items/thumbnail";
import schema from "./schema";
import { requireSetUpUser } from "./utils/auth";
import { capped } from "./utils/pagination";
import { albumColour } from "./utils/validators";

/** Every field a person sets on an Album, as the Album form sends them. */
const albumFields = {
  name: v.string(),
  description: v.optional(v.string()),
  colour: albumColour,
};

/** One of the signed-in person's Albums; anyone else's is reported as not found. */
async function requireOwnAlbum(ctx: MutationCtx, albumId: Id<"albums">) {
  const owner = await requireSetUpUser(ctx);
  const album = await ctx.db.get(albumId);
  if (!album || album.ownerId !== owner._id)
    throw new ConvexError(albumErrors.notFound);
  return album;
}

/**
 * Creates an Album in the signed-in person's Collection. Without a colour
 * (created by name from the Item form) it gets the palette's least used one.
 */
export const create = mutation({
  args: { ...albumFields, colour: v.optional(albumColour) },
  returns: v.id("albums"),
  handler: async (ctx, { colour, ...fields }) => {
    const owner = await requireSetUpUser(ctx);
    const albums = await ctx.db
      .query("albums")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .take(albumLimits.count);
    const album = checkAlbum({
      ...fields,
      colour: colour ?? nextColour(albums.map((other) => other.colour)),
    });
    if (albums.length >= albumLimits.count)
      throw new ConvexError(albumErrors.tooMany);
    const albumId = await ctx.db.insert("albums", {
      ownerId: owner._id,
      ...album,
      itemCount: 0,
      soldItemCount: 0,
    });
    await countAlbumCreated(ctx, { ownerId: owner._id });
    return albumId;
  },
});

/**
 * The signed-in person's Albums, oldest first, each with how many Items it
 * holds and how many of those they still own.
 */
export const list = query({
  args: {},
  returns: v.array(schema.doc("albums").extend({ ownedItemCount: v.number() })),
  handler: async (ctx) => {
    const owner = await requireSetUpUser(ctx);
    const albums = await ctx.db
      .query("albums")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .take(albumLimits.count);
    return await Promise.all(
      albums.map(async (album) => ({
        ...album,
        ownedItemCount: await ownedItemCount(ctx, album),
      })),
    );
  },
});

/** Saves the Album form: a description left empty is cleared. */
export const update = mutation({
  args: { albumId: v.id("albums"), ...albumFields },
  returns: v.null(),
  handler: async (ctx, { albumId, ...fields }) => {
    await requireOwnAlbum(ctx, albumId);
    await ctx.db.patch(albumId, {
      description: undefined,
      ...checkAlbum(fields),
    });
    return null;
  },
});

/** One of the signed-in person's Albums, with its Item count; null if it isn't theirs. */
export const get = query({
  args: { albumId: v.string() },
  returns: v.union(schema.doc("albums"), v.null()),
  handler: async (ctx, { albumId }) => {
    const owner = await requireSetUpUser(ctx);
    const id = ctx.db.normalizeId("albums", albumId);
    const album = id ? await ctx.db.get(id) : null;
    return album && album.ownerId === owner._id ? album : null;
  },
});

/**
 * The Items in one of the signed-in person's Albums, newest first, a page at
 * a time (up to ITEM_LIST_PAGE_SIZE), their facts resolved and each with its list thumbnail as in the
 * Collection.
 */
export const items = query({
  args: { albumId: v.id("albums"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { albumId, paginationOpts }) => {
    const owner = await requireSetUpUser(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId_and_albumId", (q) =>
        q.eq("ownerId", owner._id).eq("albumId", albumId),
      )
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

/** How many ticked Items one transaction deletes with an Album; the rest follow. */
export const albumDeleteBatch = 100;

/**
 * Deletes an Album. The ticked Items, which must be in it, are deleted for
 * good; the rest stay in the Collection without an Album. The Album and the
 * first batch of ticked Items go at once, the other Items in the
 * background, a batch per transaction.
 */
export const remove = mutation({
  args: { albumId: v.id("albums"), deleteItemIds: v.array(v.id("items")) },
  returns: v.null(),
  handler: async (ctx, { albumId, deleteItemIds }) => {
    const album = await requireOwnAlbum(ctx, albumId);
    const ticked = [...new Set(deleteItemIds)];
    for (const itemId of ticked.slice(0, albumDeleteBatch)) {
      const item = await ctx.db.get(itemId);
      if (!item || item.ownerId !== album.ownerId || item.albumId !== albumId)
        throw new ConvexError(itemNotFound);
      await deleteItem(ctx, item);
    }
    await ctx.db.delete(albumId);
    await countAlbumDeleted(ctx, album);
    await deleteTickedThenRelease(ctx, {
      ownerId: album.ownerId,
      albumId,
      itemIds: ticked.slice(albumDeleteBatch),
    });
    return null;
  },
});

const albumRemainder = {
  ownerId: v.id("users"),
  albumId: v.id("albums"),
  /** Ticked Items still to delete; the Album's other Items are released after. */
  itemIds: v.array(v.id("items")),
};

/**
 * Schedules the next batch of a deleted Album's ticked Items, or, once they
 * are all gone, starts letting go of the rest.
 */
async function deleteTickedThenRelease(
  ctx: MutationCtx,
  left: { ownerId: Id<"users">; albumId: Id<"albums">; itemIds: Id<"items">[] },
) {
  if (left.itemIds.length > 0)
    await ctx.scheduler.runAfter(0, internal.albums.deleteTicked, left);
  else await releaseItems(ctx, left.ownerId, left.albumId);
}

/**
 * Deletes the next batch of a deleted Album's ticked Items. One that has
 * left the Album or gone meanwhile is passed over.
 */
export const deleteTicked = internalMutation({
  args: albumRemainder,
  returns: v.null(),
  handler: async (ctx, { ownerId, albumId, itemIds }) => {
    for (const itemId of itemIds.slice(0, albumDeleteBatch)) {
      const item = await ctx.db.get(itemId);
      if (item && item.ownerId === ownerId && item.albumId === albumId)
        await deleteItem(ctx, item);
    }
    await deleteTickedThenRelease(ctx, {
      ownerId,
      albumId,
      itemIds: itemIds.slice(albumDeleteBatch),
    });
    return null;
  },
});

/** Continues taking a deleted Album's Items out of it. */
export const release = internalMutation({
  args: { ownerId: v.id("users"), albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, { ownerId, albumId }) => {
    await releaseItems(ctx, ownerId, albumId);
    return null;
  },
});

/** How many Items one transaction takes out of a deleted Album; the rest follow. */
const releaseBatch = 200;

/** Leaves a deleted Album's Items in the Collection without an Album, a batch at a time. */
async function releaseItems(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  albumId: Id<"albums">,
) {
  const batch = await ctx.db
    .query("items")
    .withIndex("by_ownerId_and_albumId", (q) =>
      q.eq("ownerId", ownerId).eq("albumId", albumId),
    )
    .take(releaseBatch);
  for (const item of batch)
    await ctx.db.patch(item._id, { albumId: undefined });
  if (batch.length === releaseBatch)
    await ctx.scheduler.runAfter(0, internal.albums.release, {
      ownerId,
      albumId,
    });
}
