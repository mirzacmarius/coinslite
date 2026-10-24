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
import { ownedItemCount } from "./albums/membership";
import { albumErrors } from "./albums/rules";
import { nodeByKey } from "./catalog/browse";
import { setView, setViewOf } from "./catalog/sets";
import { catalogVisibleTo } from "./featureFlags";
import { resolveItems } from "./items/resolve";
import { withThumbnail } from "./items/thumbnail";
import {
  isShareToken,
  shareErrors,
  shareLimits,
  sharedItemOf,
  targetIdOf,
} from "./shares/rules";
import { requireSetUpUser } from "./utils/auth";
import { hex } from "./utils/hex";
import { capped } from "./utils/pagination";
import {
  type ShareTarget,
  albumColour,
  gradingScale,
  homeCurrency,
  itemType,
  material,
  shareTarget,
  strike,
} from "./utils/validators";

/**
 * Share links (spec §8 and §6.4). The owner of an Album, or anyone viewing a
 * Set, can make a link that shows it read-only to whoever has the link,
 * signed in or not: the Album's name, description and owned Items (the facts
 * in shares/rules.ts `sharedItemFields`, with a thumbnail), or the Set's
 * entries with which ones the owner holds. Market values and their total
 * show only once the owner turns them on. Nothing else about the Collection
 * leaves it.
 *
 * The owner's side (`mine`, `start`, `setShowValues`, `stop`) is signed in;
 * the page's side (`view`, `items`) is public, and the token in the link
 * stands for the sign-in: it names the share, and the share names what to
 * show and whose Items to read. Stopping a share deletes it, so a copied
 * link stops working at once; so does deleting the Album, or the account.
 * The thumbnails go through the signed photo links (photos/links.ts), good
 * for a day each, issued here for the owner's photos.
 */

/** The signed-in person's share of a target, if they have one. */
async function shareOf(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  target: ShareTarget,
) {
  return await ctx.db
    .query("shares")
    .withIndex("by_ownerId_and_targetId", (q) =>
      q.eq("ownerId", ownerId).eq("targetId", targetIdOf(target)),
    )
    .unique();
}

/** A share as its owner sees it: the token for the link, and the values switch. */
const ownShare = v.object({
  shareId: v.id("shares"),
  token: v.string(),
  showValues: v.boolean(),
});

const ownShareOf = (share: Doc<"shares">) => ({
  shareId: share._id,
  token: share.token,
  showValues: share.showValues,
});

/** The signed-in person's share of an Album or Set, or null while it isn't shared. */
export const mine = query({
  args: { target: shareTarget },
  returns: v.union(v.null(), ownShare),
  handler: async (ctx, { target }) => {
    const owner = await requireSetUpUser(ctx);
    const share = await shareOf(ctx, owner._id, target);
    return share && ownShareOf(share);
  },
});

/** One's own Album, or a grouping of a Catalog one can see; anything else can't be shared. */
async function requireShareable(
  ctx: QueryCtx,
  owner: Doc<"users">,
  target: ShareTarget,
) {
  if (target.kind === "album") {
    const album = await ctx.db.get(target.albumId);
    if (!album || album.ownerId !== owner._id)
      throw new ConvexError(albumErrors.notFound);
    return;
  }
  if (!(await catalogVisibleTo(ctx, owner)))
    throw new ConvexError(shareErrors.notShareable);
  const node = await nodeByKey(ctx, target.key);
  if (!node || node.kind === "entry")
    throw new ConvexError(shareErrors.notShareable);
}

/** A fresh token: random bytes as hex, as `isShareToken` expects them. */
function newToken() {
  const bytes = new Uint8Array(shareLimits.tokenBytes);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

/**
 * Starts sharing an Album or a Set: makes its share, with values off, or
 * gives back the one it already has, so the link stays the same however
 * often the dialog opens.
 */
export const start = mutation({
  args: { target: shareTarget },
  returns: ownShare,
  handler: async (ctx, { target }) => {
    const owner = await requireSetUpUser(ctx);
    await requireShareable(ctx, owner, target);
    const existing = await shareOf(ctx, owner._id, target);
    if (existing) return ownShareOf(existing);
    const token = newToken();
    const shareId = await ctx.db.insert("shares", {
      ownerId: owner._id,
      target,
      targetId: targetIdOf(target),
      token,
      showValues: false,
    });
    return { shareId, token, showValues: false };
  },
});

/** One of the signed-in person's shares; anyone else's is reported as not found. */
async function requireOwnShare(ctx: MutationCtx, shareId: Id<"shares">) {
  const owner = await requireSetUpUser(ctx);
  const share = await ctx.db.get(shareId);
  if (!share || share.ownerId !== owner._id)
    throw new ConvexError(shareErrors.notFound);
  return share;
}

/** Shows or hides the Market values on a shared Album's page. */
export const setShowValues = mutation({
  args: { shareId: v.id("shares"), showValues: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { shareId, showValues }) => {
    await requireOwnShare(ctx, shareId);
    await ctx.db.patch(shareId, { showValues });
    return null;
  },
});

/** Stops sharing: the link stops working at once; sharing again makes a new one. */
export const stop = mutation({
  args: { shareId: v.id("shares") },
  returns: v.null(),
  handler: async (ctx, { shareId }) => {
    await requireOwnShare(ctx, shareId);
    await ctx.db.delete(shareId);
    return null;
  },
});

/** Deletes the share of a target that is going, such as an Album being deleted (albums.ts). */
export async function deleteShareOf(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  targetId: string,
) {
  const share = await ctx.db
    .query("shares")
    .withIndex("by_ownerId_and_targetId", (q) =>
      q.eq("ownerId", ownerId).eq("targetId", targetId),
    )
    .unique();
  if (share) await ctx.db.delete(share._id);
}

/**
 * The share a link's token names, with its owner. Null for a token that
 * names none, and while the owner's account is deactivated: what they chose
 * to show goes with the account.
 */
async function shareByToken(ctx: QueryCtx, token: string) {
  if (!isShareToken(token)) return null;
  const share = await ctx.db
    .query("shares")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!share) return null;
  const owner = await ctx.db.get(share.ownerId);
  if (!owner || owner.deactivatedAt !== undefined) return null;
  const { homeCurrency } = owner;
  if (homeCurrency === undefined) return null;
  return { share, owner: { ...owner, homeCurrency } };
}

/** Who shares the page, as the owner shows their name in the app. */
const sharedBy = (owner: Doc<"users">) => {
  const name = owner.displayName ?? owner.name;
  return name === undefined ? {} : { sharedBy: name };
};

const sharedAlbum = v.object({
  kind: v.literal("album"),
  sharedBy: v.optional(v.string()),
  name: v.string(),
  description: v.optional(v.string()),
  colour: albumColour,
  /** How many Items in the Album the owner still has. */
  itemCount: v.number(),
  showValues: v.boolean(),
  /** The owner's Home currency, which the Market values are in. */
  currency: homeCurrency,
  /**
   * The owned Items' Market value, times their Quantity, added up. Null
   * while values are off, and for an Album too large to add up in one go.
   */
  marketValue: v.union(v.number(), v.null()),
});

const sharedSet = setView.extend({
  kind: v.literal("set"),
  sharedBy: v.optional(v.string()),
});

/** The Items in an Album the owner still has, by the index Set completion reads too. */
const ownedAlbumItems = (ctx: QueryCtx, album: Doc<"albums">) =>
  ctx.db
    .query("items")
    .withIndex("by_ownerId_and_albumId_and_soldOn", (q) =>
      q
        .eq("ownerId", album.ownerId)
        .eq("albumId", album._id)
        .eq("soldOn", undefined),
    );

/** What a shared Album's owned Items are worth together; null past `shareLimits.valuedItems` Items. */
async function albumMarketValue(ctx: QueryCtx, album: Doc<"albums">) {
  const items = await ownedAlbumItems(ctx, album).take(
    shareLimits.valuedItems + 1,
  );
  if (items.length > shareLimits.valuedItems) return null;
  return items.reduce(
    (sum, item) => sum + (item.marketValue ?? 0) * item.quantity,
    0,
  );
}

/**
 * The shared page a link opens, for whoever has it: the Album, or the Set
 * with how the owner holds it. Null when the link names nothing (never
 * shared, stopped, the Album or account deleted), when the Catalog is
 * hidden from the owner, or when the Set has stopped being one.
 */
export const view = query({
  args: { token: v.string() },
  returns: v.union(v.null(), sharedAlbum, sharedSet),
  handler: async (ctx, { token }) => {
    const found = await shareByToken(ctx, token);
    if (!found) return null;
    const { share, owner } = found;
    if (share.target.kind === "album") {
      const album = await ctx.db.get(share.target.albumId);
      if (!album || album.ownerId !== owner._id) return null;
      return {
        kind: "album" as const,
        ...sharedBy(owner),
        name: album.name,
        ...(album.description !== undefined && {
          description: album.description,
        }),
        colour: album.colour,
        itemCount: await ownedItemCount(ctx, album),
        showValues: share.showValues,
        currency: owner.homeCurrency,
        marketValue: share.showValues
          ? await albumMarketValue(ctx, album)
          : null,
      };
    }
    if (!(await catalogVisibleTo(ctx, owner))) return null;
    const { key, denomination, series } = share.target;
    const set = await setViewOf(ctx, owner._id, key, {
      ...(denomination !== undefined && { denomination }),
      ...(series !== undefined && { series }),
    });
    if (!set || "tooLarge" in set) return null;
    return { kind: "set" as const, ...sharedBy(owner), ...set };
  },
});

/** An Item as the shared page shows it (shares/rules.ts `sharedItemOf`). */
const sharedItem = v.object({
  id: v.id("items"),
  type: itemType,
  title: v.string(),
  country: v.optional(v.string()),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  material: v.optional(material),
  grade: v.optional(v.string()),
  gradingScale: v.optional(gradingScale),
  strike: v.optional(strike),
  quantity: v.number(),
  marketValue: v.optional(v.number()),
  thumbnailUrl: v.union(v.string(), v.null()),
});

const noItems = { page: [], isDone: true, continueCursor: "" };

/**
 * The Items of a shared Album, newest first, a page at a time (up to
 * `shareLimits.pageSize`), as the shared page shows them. Empty for a link
 * that opens nothing, or a Set.
 */
export const items = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(sharedItem),
  handler: async (ctx, { token, paginationOpts }) => {
    const found = await shareByToken(ctx, token);
    if (!found) return noItems;
    const { share, owner } = found;
    const { target } = share;
    if (target.kind !== "album") return noItems;
    const album = await ctx.db.get(target.albumId);
    if (!album || album.ownerId !== owner._id) return noItems;
    const page = await ownedAlbumItems(ctx, album)
      .order("desc")
      .paginate(capped(paginationOpts, { numItems: shareLimits.pageSize }));
    const resolved = await resolveItems(ctx, page.page);
    return {
      ...page,
      page: await Promise.all(
        resolved.map(async (item) =>
          sharedItemOf(await withThumbnail(ctx, item), share.showValues),
        ),
      ),
    };
  },
});
