import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { albumErrors } from "./rules";

/**
 * Which Album an Item belongs to. An Item is in at most one Album, and each
 * Album keeps a count of its Items, so every write that puts an Item in an
 * Album, takes it out or deletes it goes through here.
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

/** Keeps the Item counts right as an Item leaves one Album and joins another; either may be none. */
export async function moveBetweenAlbums(
  ctx: MutationCtx,
  from: Id<"albums"> | undefined,
  to: Id<"albums"> | undefined,
) {
  if (from === to) return;
  if (from !== undefined) await addToCount(ctx, from, -1);
  if (to !== undefined) await addToCount(ctx, to, 1);
}

/**
 * Keeps the Item counts right as many Items move at once: each Album's count
 * changes once, by its net change.
 */
export async function moveManyBetweenAlbums(
  ctx: MutationCtx,
  moves: ReadonlyArray<{
    from: Id<"albums"> | undefined;
    to: Id<"albums"> | undefined;
  }>,
) {
  const changes = new Map<Id<"albums">, number>();
  const change = (albumId: Id<"albums"> | undefined, by: number) => {
    if (albumId !== undefined)
      changes.set(albumId, (changes.get(albumId) ?? 0) + by);
  };
  for (const { from, to } of moves) {
    if (from === to) continue;
    change(from, -1);
    change(to, 1);
  }
  for (const [albumId, by] of changes)
    if (by !== 0) await addToCount(ctx, albumId, by);
}

async function addToCount(
  ctx: MutationCtx,
  albumId: Id<"albums">,
  change: number,
) {
  // An Album being deleted may already be gone; its count doesn't matter then.
  const album = await ctx.db.get(albumId);
  if (album)
    await ctx.db.patch(albumId, {
      itemCount: Math.max(0, album.itemCount + change),
    });
}
