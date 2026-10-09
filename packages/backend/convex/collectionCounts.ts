import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { albumLimits } from "./albums/rules";
import { planCopiesOf } from "./billing";

/**
 * How many Items (in all and of each Item type) and Albums each person has,
 * kept in one `collectionCounts` document per person so that figures across
 * everyone, and lists of people by how much they hold, never count Items one
 * by one.
 *
 * Every write that adds or removes an Item or an Album, or changes an Item's
 * type, tells this module in the same transaction: call `countItemAdded`
 * after inserting an Item (once per Item when adding many),
 * `countItemRemoved` when deleting one (`deleteItem` in items/deletion.ts
 * does), `countItemRetyped` when its type changes, and `countAlbumCreated` /
 * `countAlbumDeleted` for Albums. A new account starts with empty counts
 * (`startCollectionCounts`), so the admin user list ranks everyone by them;
 * deleting an account deletes its counts with the profile
 * (`deleteCollectionCountsOf`). Read counts with `collectionCountsOf`.
 *
 * Collections from before counting began have no document yet. Theirs is made
 * the first time it's needed, by counting what's there; a removal before
 * that changes nothing, since that count will see the result. A removal for
 * someone whose account is being deleted doesn't make one either.
 *
 * Each document also carries a copy of its person's plan, kept by billing.ts,
 * so the admin user list can rank the people on one plan.
 */

export type CollectionCounts = Pick<
  Doc<"collectionCounts">,
  "items" | "coins" | "banknotes" | "stamps" | "albums"
>;

type ItemType = Doc<"items">["type"];

const typeCount = {
  coin: "coins",
  banknote: "banknotes",
  stamp: "stamps",
} as const satisfies Record<ItemType, keyof CollectionCounts>;

/** An empty Collection. */
export const noCollection = (): CollectionCounts => ({
  items: 0,
  coins: 0,
  banknotes: 0,
  stamps: 0,
  albums: 0,
});

/**
 * The most Items counting a Collection from scratch reads. Only Collections
 * from before counting began are counted that way, and none comes close.
 */
const recountLimit = 8000;

const storedCounts = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("collectionCounts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

/** Counts a person's Items and Albums one by one, as they are now. */
async function countCollection(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CollectionCounts> {
  const counts = noCollection();
  const items = await ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .take(recountLimit + 1);
  if (items.length > recountLimit) {
    throw new Error(`Collection of ${userId} is too large to count at once`);
  }
  for (const { type } of items) {
    counts.items++;
    counts[typeCount[type]]++;
  }
  const albums = await ctx.db
    .query("albums")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .take(albumLimits.count + 1);
  counts.albums = albums.length;
  return counts;
}

const countsOnly = ({
  items,
  coins,
  banknotes,
  stamps,
  albums,
}: CollectionCounts): CollectionCounts => ({
  items,
  coins,
  banknotes,
  stamps,
  albums,
});

/**
 * How many Items (in all and of each type) and Albums a person has. One
 * document read; for a Collection not counted yet, it's counted on the spot.
 */
export async function collectionCountsOf(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CollectionCounts> {
  const stored = await storedCounts(ctx, userId);
  return stored ? countsOnly(stored) : await countCollection(ctx, userId);
}

/**
 * Like `collectionCountsOf`, but stores the count of a Collection not counted
 * yet, so it's kept from now on.
 */
export async function ensureCollectionCounts(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<CollectionCounts> {
  const stored = await storedCounts(ctx, userId);
  if (stored) return countsOnly(stored);
  const counts = await countCollection(ctx, userId);
  const { plan } = await planCopiesOf(ctx, userId);
  await ctx.db.insert("collectionCounts", { userId, ...counts, plan });
  return counts;
}

/** A new account's counts: nothing yet, on the Free plan. */
export async function startCollectionCounts(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  await ctx.db.insert("collectionCounts", { userId, ...noCollection() });
}

/**
 * Applies a change that has just been written. With no document yet, an
 * addition counts the Collection as it now is (the change included); a
 * removal or retyping leaves it to that count.
 */
async function change(
  ctx: MutationCtx,
  userId: Id<"users">,
  delta: Partial<CollectionCounts>,
  { adds }: { adds: boolean },
) {
  const stored = await storedCounts(ctx, userId);
  if (!stored) {
    if (adds) await ensureCollectionCounts(ctx, userId);
    return;
  }
  const patch: Partial<CollectionCounts> = {};
  for (const [field, by] of Object.entries(delta) as [
    keyof CollectionCounts,
    number,
  ][]) {
    patch[field] = Math.max(0, stored[field] + by);
  }
  await ctx.db.patch(stored._id, patch);
}

/** After inserting an Item. */
export async function countItemAdded(
  ctx: MutationCtx,
  item: Pick<Doc<"items">, "ownerId" | "type">,
) {
  await change(
    ctx,
    item.ownerId,
    { items: 1, [typeCount[item.type]]: 1 },
    { adds: true },
  );
}

/** After deleting an Item. */
export async function countItemRemoved(
  ctx: MutationCtx,
  item: Pick<Doc<"items">, "ownerId" | "type">,
) {
  await change(
    ctx,
    item.ownerId,
    { items: -1, [typeCount[item.type]]: -1 },
    { adds: false },
  );
}

/** After changing an Item's type from `from` to `to`. */
export async function countItemRetyped(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  from: ItemType,
  to: ItemType,
) {
  if (from === to) return;
  await change(
    ctx,
    ownerId,
    { [typeCount[from]]: -1, [typeCount[to]]: 1 },
    { adds: false },
  );
}

/** After inserting an Album. */
export async function countAlbumCreated(
  ctx: MutationCtx,
  album: Pick<Doc<"albums">, "ownerId">,
) {
  await change(ctx, album.ownerId, { albums: 1 }, { adds: true });
}

/** After deleting an Album. */
export async function countAlbumDeleted(
  ctx: MutationCtx,
  album: Pick<Doc<"albums">, "ownerId">,
) {
  await change(ctx, album.ownerId, { albums: -1 }, { adds: false });
}

/**
 * When an account is deleted: its counts go with the profile. Deleting its
 * Items and Albums afterwards, at once or in the background, doesn't bring
 * them back.
 */
export async function deleteCollectionCountsOf(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const stored = await storedCounts(ctx, userId);
  if (stored) await ctx.db.delete(stored._id);
}
