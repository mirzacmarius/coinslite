import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { albumErrors } from "./rules";

/**
 * Which Album an Item belongs to. An Item is in at most one Album, and each
 * Album keeps a count of its Items and of the sold ones among them, so every
 * write that puts an Item in an Album, takes it out, deletes it, sells it or
 * makes it owned again goes through here.
 */

/** The Album an Item may go into: one of the owner's own, or none. */
export async function ownAlbumId(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  albumId: Id<"albums"> | undefined,
) {
  if (albumId === undefined) return undefined;
  const album = await ctx.db.get(albumId);
  if (!album || album.ownerId !== ownerId)
    throw new ConvexError(albumErrors.notFound);
  return albumId;
}

/**
 * Keeps the Item counts right as an Item leaves one Album and joins another;
 * either may be none. `sold` says whether the Item is sold. Call it after
 * writing the Item.
 */
export async function moveBetweenAlbums(
  ctx: MutationCtx,
  from: Id<"albums"> | undefined,
  to: Id<"albums"> | undefined,
  sold: boolean,
) {
  if (from === to) return;
  const soldChange = sold ? 1 : 0;
  if (from !== undefined) await addToCounts(ctx, from, -1, -soldChange);
  if (to !== undefined) await addToCounts(ctx, to, 1, soldChange);
}

/**
 * Keeps an Album's count of sold Items right as one of its Items is sold
 * (`sold` true) or owned again. Call it after writing the Item.
 */
export async function saleChangedInAlbum(
  ctx: MutationCtx,
  albumId: Id<"albums"> | undefined,
  sold: boolean,
) {
  if (albumId !== undefined) await addToCounts(ctx, albumId, 0, sold ? 1 : -1);
}

/**
 * Keeps the Item counts right as many Items move at once: each Album's counts
 * change once, by their net change. Call it after writing the Items.
 */
export async function moveManyBetweenAlbums(
  ctx: MutationCtx,
  moves: ReadonlyArray<{
    from: Id<"albums"> | undefined;
    to: Id<"albums"> | undefined;
    sold: boolean;
  }>,
) {
  const changes = new Map<Id<"albums">, { items: number; sold: number }>();
  const change = (
    albumId: Id<"albums"> | undefined,
    by: number,
    sold: boolean,
  ) => {
    if (albumId === undefined) return;
    const counts = changes.get(albumId) ?? { items: 0, sold: 0 };
    changes.set(albumId, {
      items: counts.items + by,
      sold: counts.sold + (sold ? by : 0),
    });
  };
  for (const { from, to, sold } of moves) {
    if (from === to) continue;
    change(from, -1, sold);
    change(to, 1, sold);
  }
  for (const [albumId, by] of changes)
    if (by.items !== 0 || by.sold !== 0)
      await addToCounts(ctx, albumId, by.items, by.sold);
}

/**
 * The most sold Items counting an Album's from scratch reads. Only Albums
 * from before the count was kept are counted that way, and none comes close.
 */
const soldRecountLimit = 8000;

/** Counts an Album's sold Items one by one, as they are now. */
async function countSoldItems(ctx: QueryCtx, album: Doc<"albums">) {
  const sold = await ctx.db
    .query("items")
    .withIndex("by_ownerId_and_albumId_and_soldOn", (q) =>
      q.eq("ownerId", album.ownerId).eq("albumId", album._id).gt("soldOn", ""),
    )
    .take(soldRecountLimit);
  return sold.length;
}

/**
 * How many of an Album's Items are owned: its Items less the sold ones.
 * Albums from before the sold count was kept have theirs counted here until
 * a write stores it.
 */
export async function ownedItemCount(ctx: QueryCtx, album: Doc<"albums">) {
  const sold = album.soldItemCount ?? (await countSoldItems(ctx, album));
  return Math.max(0, album.itemCount - sold);
}

async function addToCounts(
  ctx: MutationCtx,
  albumId: Id<"albums">,
  change: number,
  soldChange: number,
) {
  // An Album being deleted may already be gone; its counts don't matter then.
  const album = await ctx.db.get(albumId);
  if (!album) return;
  await ctx.db.patch(albumId, {
    itemCount: Math.max(0, album.itemCount + change),
    // Counted from the Items, which already show this change, the first
    // time an Album from before the sold count was kept needs it.
    soldItemCount:
      album.soldItemCount === undefined
        ? await countSoldItems(ctx, album)
        : Math.max(0, album.soldItemCount + soldChange),
  });
}
