import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** How long after uploading a file it can still be put to use. */
export const uploadLifetime = 60 * 60 * 1000;

/** What an upload is for: an Item's photo, or a Catalog entry's image file. */
export type UploadPurpose = "photo" | "catalogImage";

/** Whether a stored file is an Item's photo or a Catalog entry's image. */
export async function fileInUse(ctx: QueryCtx, storageId: Id<"_storage">) {
  const user =
    (await ctx.db
      .query("items")
      .withIndex("by_frontPhoto", (q) => q.eq("frontPhoto", storageId))
      .first()) ??
    (await ctx.db
      .query("items")
      .withIndex("by_backPhoto", (q) => q.eq("backPhoto", storageId))
      .first()) ??
    (await ctx.db
      .query("catalogNodes")
      .withIndex("by_imageFiles_full", (q) =>
        q.eq("imageFiles.full", storageId),
      )
      .first()) ??
    (await ctx.db
      .query("catalogNodes")
      .withIndex("by_imageFiles_thumbnail", (q) =>
        q.eq("imageFiles.thumbnail", storageId),
      )
      .first());
  return user !== null;
}

/**
 * A stored file someone may put to use: a fresh upload that is neither an
 * Item's photo nor a Catalog entry's image yet. Null when it can't be used.
 */
async function freshUpload(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  now: number,
) {
  const stored = await ctx.db.system.get("_storage", storageId);
  if (!stored || stored._creationTime <= now - uploadLifetime) return null;
  return (await fileInUse(ctx, storageId)) ? null : stored;
}

/** Who an upload is registered to, and for what, if anyone. */
const registrationOf = (ctx: QueryCtx, storageId: Id<"_storage">) =>
  ctx.db
    .query("uploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();

/**
 * Registers a fresh upload to `ownerId` for `purpose`, the first time anyone
 * signed in uses it, and returns it. From then on only they can put it to
 * that use or have it thrown away: a file id alone is no key to a file
 * someone else uploaded. Null when the file can't be used (gone, too old,
 * in use, or registered to someone or something else).
 */
export async function claimUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  ownerId: Id<"users">,
  purpose: UploadPurpose,
  now: number,
) {
  const file = await freshUpload(ctx, storageId, now);
  if (!file) return null;
  const registration = await registrationOf(ctx, storageId);
  if (!registration) {
    await ctx.db.insert("uploads", { storageId, ownerId, purpose });
    return file;
  }
  return registration.ownerId === ownerId && registration.purpose === purpose
    ? file
    : null;
}

/** A fresh upload registered to `ownerId` for `purpose`; null otherwise. */
export async function ownUpload(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  ownerId: Id<"users">,
  purpose: UploadPurpose,
  now: number,
) {
  const file = await freshUpload(ctx, storageId, now);
  const registration = file && (await registrationOf(ctx, storageId));
  return registration?.ownerId === ownerId && registration.purpose === purpose
    ? file
    : null;
}

/** Once an upload has become a photo or an image, it is no longer pending. */
export async function settleUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
) {
  const registration = await registrationOf(ctx, storageId);
  if (registration) await ctx.db.delete(registration._id);
}

/** Throws away an upload that won't be used: its file, unless in use, and its registration. */
export async function discardUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
) {
  await settleUpload(ctx, storageId);
  if (
    (await ctx.db.system.get("_storage", storageId)) &&
    !(await fileInUse(ctx, storageId))
  )
    await ctx.storage.delete(storageId);
}
