import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  action,
  internalMutation,
  mutation,
} from "../_generated/server";
import { limitUploads } from "../uploads";
import { requireAdmin } from "../utils/auth";
import {
  claimUpload,
  discardUpload,
  ownUpload,
  settleUpload,
} from "../utils/files";
import {
  type CatalogImageError,
  type ImageCredit,
  catalogImageErrors,
  catalogImageLimits,
  checkImageCredit,
  fullImageBounds,
  reproducedUnderEcbRules,
  webpHeaderLength,
  webpSize,
  withinBounds,
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
  if (node?.kind !== "entry")
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
 * registered to them for a Catalog image that no Item or Catalog entry uses,
 * one for each size.
 */
async function checkUpload(
  ctx: QueryCtx,
  { key, full, thumbnail }: Upload,
  now: number,
) {
  const admin = await requireAdmin(ctx);
  const entry = await requireEntry(ctx, key);
  const own = (file: Id<"_storage">) =>
    ownUpload(ctx, file, admin._id, "catalogImage", now);
  const fullFile = await own(full);
  const thumbnailFile = await own(thumbnail);
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

/** A one-time address the admin's browser sends one image file to before `register`. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    await limitUploads(ctx, admin._id);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registers a file the admin just uploaded as their Catalog image upload, so
 * nobody else can use it or have it thrown away. `attach` registers files
 * that aren't yet.
 */
export const register = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { storageId }) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    if (!(await claimUpload(ctx, storageId, admin._id, "catalogImage", now)))
      throw new ConvexError(catalogImageErrors.notFound);
    return null;
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

/** What `claim` finds out about the upload and the entry it is for. */
type Claimed = {
  bytes: { full: number; thumbnail: number };
  /** The entry's width and height, in millimetres, if it has them. */
  entry: { width?: number; height?: number };
};

/**
 * Why two uploaded files can't be an entry's image, or undefined when they
 * can: both must be WebP, the full size at most 800 px on its longest side
 * (a banknote reproduced under the ECB's rules no more than 72 dpi at its
 * real size, imageRules.ts `fullImageBounds`), the thumbnail at most 128 px
 * and no bigger than the full size.
 */
async function imageProblem(
  ctx: ActionCtx,
  { full, thumbnail }: Upload,
  { bytes, entry }: Claimed,
  licence: string,
): Promise<CatalogImageError | undefined> {
  const bounds = fullImageBounds(entry, licence);
  if (!bounds) return catalogImageErrors.reproductionSizeRequired;
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
  if (!withinBounds(fullSize, bounds))
    return catalogImageErrors.overReproductionLimit;
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
    const claimed: Claimed = await ctx.runMutation(
      internal.catalog.images.claim,
      upload,
    );
    const checked = checkImageCredit(credit);
    const problem =
      "problem" in checked
        ? checked.problem
        : await imageProblem(ctx, upload, claimed, checked.credit.licence);
    if (problem) {
      await ctx.runMutation(internal.catalog.images.discard, upload);
      throw new ConvexError(problem);
    }
    await ctx.runMutation(internal.catalog.images.save, { ...upload, credit });
    return null;
  },
});

/**
 * Registers the files to the admin if nobody has yet, and returns the sizes
 * in bytes of the files they may put on the entry, with the entry's width
 * and height.
 */
export const claim = internalMutation({
  args: uploadArgs,
  returns: v.object({
    bytes: v.object({ full: v.number(), thumbnail: v.number() }),
    entry: v.object({
      width: v.optional(v.number()),
      height: v.optional(v.number()),
    }),
  }),
  handler: async (ctx, upload) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    if (upload.full !== upload.thumbnail) {
      for (const file of [upload.full, upload.thumbnail])
        await claimUpload(ctx, file, admin._id, "catalogImage", now);
    }
    const { entry, fullFile, thumbnailFile } = await checkUpload(
      ctx,
      upload,
      now,
    );
    return {
      bytes: { full: fullFile.size, thumbnail: thumbnailFile.size },
      entry: {
        ...(entry.width !== undefined && { width: entry.width }),
        ...(entry.height !== undefined && { height: entry.height }),
      },
    };
  },
});

/** Throws away uploads of the admin's that were rejected. */
export const discard = internalMutation({
  args: uploadArgs,
  returns: v.null(),
  handler: async (ctx, upload) => {
    await checkUpload(ctx, upload, Date.now());
    await discardUpload(ctx, upload.full);
    await discardUpload(ctx, upload.thumbnail);
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
    await settleUpload(ctx, upload.full);
    await settleUpload(ctx, upload.thumbnail);
    return null;
  },
});

/**
 * Changes the credit of an entry's image, keeping the image. An image can't
 * newly be credited as reproduced under the ECB's rules: its size wasn't
 * checked against them, so it is chosen again instead.
 */
export const updateCredit = mutation({
  args: { key: v.string(), credit },
  returns: v.null(),
  handler: async (ctx, { key, credit }) => {
    await requireAdmin(ctx);
    const entry = await requireEntry(ctx, key);
    const imageProvenance = requireCredit(credit);
    if (!entry.imageFiles && !entry.imageUrl)
      throw new ConvexError(catalogImageErrors.noImage);
    if (
      reproducedUnderEcbRules(imageProvenance.licence) &&
      !reproducedUnderEcbRules(entry.imageProvenance?.licence)
    )
      throw new ConvexError(catalogImageErrors.overReproductionLimit);
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
