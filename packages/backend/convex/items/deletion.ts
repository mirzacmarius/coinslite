import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { moveBetweenAlbums } from "../albums/membership";
import { countItemRemoved } from "../collectionCounts";
import { deleteHistory } from "./valueHistory";

/**
 * Deletes an Item for good, together with its stored photos (sides and more)
 * and their thumbnails, and its Market value history, and takes it out of
 * its Album's Item count and its owner's Collection counts. The one
 * way to delete Items: deleting one Item, an Album with chosen Items, or a
 * whole account all go through here so no photo is left behind and nothing
 * miscounts.
 *
 * It checks nothing: the caller has already made sure the Item is the
 * signed-in person's (or that the whole account is going). Returns how many
 * more documents (photos and history points) went with the Item, for
 * callers that budget their writes.
 */
export async function deleteItem(ctx: MutationCtx, item: Doc<"items">) {
  const { frontPhoto, frontThumbnail, backPhoto, backThumbnail } = item;
  for (const file of [frontPhoto, frontThumbnail, backPhoto, backThumbnail]) {
    if (file) await ctx.storage.delete(file);
  }
  // Bounded by the per-Item limit, so all of them, whatever the limit was.
  const more = await ctx.db
    .query("itemPhotos")
    .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
    .collect();
  for (const photo of more) {
    await ctx.storage.delete(photo.storageId);
    if (photo.thumbnailId) await ctx.storage.delete(photo.thumbnailId);
    await ctx.db.delete(photo._id);
  }
  const points = await deleteHistory(ctx, item._id);
  await ctx.db.delete(item._id);
  await moveBetweenAlbums(
    ctx,
    item.albumId,
    undefined,
    item.soldOn !== undefined,
  );
  await countItemRemoved(ctx, item);
  return more.length + points;
}
