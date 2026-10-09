import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { requireAdmin } from "../utils/auth";
import { freshUpload } from "../utils/files";
import {
  type CatalogImageError,
  type ImageCredit,
  catalogImageErrors,
  catalogImageLimits,
  checkImageCredit,
  webpHeaderLength,
  webpSize,
} from "./imageRules";

/**
 * A Catalog entry's image, for admins: upload one (as WebP at full size and
 * as a thumbnail, both made in the admin's browser), replace it, change its
 * credit or remove it. Every image is credited with its source, author,
 * licence and link (ADR 0003). Browsing shows it (catalog/browse.ts).
 */

const credit = v.object({
  source: v.string(),
  author: v.string(),
  licence: v.string(),
  link: v.string(),
});

/** The Catalog entry with this key; anything else is not found. */
async function requireEntry(ctx: QueryCtx, key: string) {
  const node = await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!node || node.kind !== "entry")
    throw new ConvexError(catalogImageErrors.entryNotFound);
  return node;
}

/** The credit, trimmed, or the error for its first problem. */
function requireCredit(value: ImageCredit) {
  const checked = checkImageCredit(value);
  if ("problem" in checked) throw new ConvexError(checked.problem);
  return checked.credit;
}

type Upload = {
  key: string;
  full: Id<"_storage">;
  thumbnail: Id<"_storage">;
};

/**
 * An admin, the entry, and the two files they uploaded for it: fresh uploads
 * that no Item or Catalog entry uses, one for each size.
 */
async function checkUpload(
  ctx: QueryCtx,
  { key, full, thumbnail }: Upload,
  now: number,
) {
  await requireAdmin(ctx);
  const entry = await requireEntry(ctx, key);
  const fullFile = await freshUpload(ctx, full, now);
  const thumbnailFile = await freshUpload(ctx, thumbnail, now);
  if (!fullFile || !thumbnailFile || full === thumbnail)
    throw new ConvexError(catalogImageErrors.notFound);
  return { entry, fullFile, thumbnailFile };
}

/** Deletes an entry's uploaded files, if it has any. */
async function deleteFiles(ctx: MutationCtx, entry: Doc<"catalogNodes">) {
  if (!entry.imageFiles) return;
  await ctx.storage.delete(entry.imageFiles.full);
  await ctx.storage.delete(entry.imageFiles.thumbnail);
}

/** A one-time address the admin's browser sends one image file to before `attach`. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const uploadArgs = {
  key: v.string(),
  full: v.id("_storage"),
  thumbnail: v.id("_storage"),
};

/** The pixel size of a stored WebP file; undefined when it isn't one. */
async function storedWebpSize(ctx: ActionCtx, storageId: Id<"_storage">) {
  const file = await ctx.storage.get(storageId);
  if (!file) return undefined;
  const head = await file.slice(0, webpHeaderLength).arrayBuffer();
  return webpSize(new Uint8Array(head));
}

/**
 * Why two uploaded files can't be an entry's image, or undefined when they
 * can: both must be WebP, the full size at most 800 px on its longest side,
 * the thumbnail at most 128 px and no bigger than the full size.
 */
async function imageProblem(
  ctx: ActionCtx,
  { full, thumbnail }: Upload,
  bytes: { full: number; thumbnail: number },
): Promise<CatalogImageError | undefined> {
  const fullSize = await storedWebpSize(ctx, full);
  const thumbnailSize = await storedWebpSize(ctx, thumbnail);
  if (!fullSize || !thumbnailSize) return catalogImageErrors.notWebp;
  const longest = (size: { width: number; height: number }) =>
    Math.max(size.width, size.height);
  if (
    longest(fullSize) > catalogImageLimits.full ||
    bytes.full > catalogImageLimits.fullBytes
  )
    return catalogImageErrors.tooLarge;
  if (
    longest(thumbnailSize) > catalogImageLimits.thumbnail ||
    thumbnailSize.width > fullSize.width ||
    thumbnailSize.height > fullSize.height ||
    bytes.thumbnail > catalogImageLimits.thumbnailBytes
  )
    return catalogImageErrors.thumbnailTooLarge;
  return undefined;
}

/**
 * Makes two uploaded WebP files a Catalog entry's image, with its credit,
 * replacing the image it had. Files that aren't right are thrown away.
 */
export const attach = action({
  args: { ...uploadArgs, credit },
  returns: v.null(),
  handler: async (ctx, { credit, ...upload }) => {
    const bytes: { full: number; thumbnail: number } = await ctx.runQuery(
      internal.catalog.images.upload,
      { ...upload, now: Date.now() },
    );
    const checked = checkImageCredit(credit);
    const problem =
      "problem" in checked
        ? checked.problem
        : await imageProblem(ctx, upload, bytes);
    if (problem) {
      await ctx.runMutation(internal.catalog.images.discard, upload);
      throw new ConvexError(problem);
    }
    await ctx.runMutation(internal.catalog.images.save, { ...upload, credit });
    return null;
  },
});

/** The sizes in bytes of the files an admin may put on the entry. */
export const upload = internalQuery({
  args: { ...uploadArgs, now: v.number() },
  returns: v.object({ full: v.number(), thumbnail: v.number() }),
  handler: async (ctx, { now, ...upload }) => {
    const { fullFile, thumbnailFile } = await checkUpload(ctx, upload, now);
    return { full: fullFile.size, thumbnail: thumbnailFile.size };
  },
});

/** Throws away uploads that were rejected. */
export const discard = internalMutation({
  args: uploadArgs,
  returns: v.null(),
  handler: async (ctx, upload) => {
    await checkUpload(ctx, upload, Date.now());
    await ctx.storage.delete(upload.full);
    await ctx.storage.delete(upload.thumbnail);
    return null;
  },
});

/** Makes checked uploads the entry's image, deleting the files of the one it replaces. */
export const save = internalMutation({
  args: { ...uploadArgs, credit },
  returns: v.null(),
  handler: async (ctx, { credit, ...upload }) => {
    const { entry } = await checkUpload(ctx, upload, Date.now());
    const imageProvenance = requireCredit(credit);
    await deleteFiles(ctx, entry);
    await ctx.db.patch("catalogNodes", entry._id, {
      imageFiles: { full: upload.full, thumbnail: upload.thumbnail },
      imageProvenance,
      imageUrl: undefined,
    });
    return null;
  },
});

/** Changes the credit of an entry's image, keeping the image. */
export const updateCredit = mutation({
  args: { key: v.string(), credit },
  returns: v.null(),
  handler: async (ctx, { key, credit }) => {
    await requireAdmin(ctx);
    const entry = await requireEntry(ctx, key);
    const imageProvenance = requireCredit(credit);
    if (!entry.imageFiles && !entry.imageUrl)
      throw new ConvexError(catalogImageErrors.noImage);
    await ctx.db.patch("catalogNodes", entry._id, { imageProvenance });
    return null;
  },
});

/** Removes an entry's image, files and credit, so it shows a placeholder. */
export const remove = mutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const entry = await requireEntry(ctx, key);
    await deleteFiles(ctx, entry);
    await ctx.db.patch("catalogNodes", entry._id, {
      imageFiles: undefined,
      imageUrl: undefined,
      imageProvenance: undefined,
    });
    return null;
  },
});
