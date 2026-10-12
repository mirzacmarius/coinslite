import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * What a person holds of a Catalog entry: the Items made from it that they
 * still own (not sold). Every question about them (any at all, how many
 * pieces, how many besides one Item) reads the same index range.
 */

/**
 * How many of a person's Items made from one Catalog entry are counted for
 * how many pieces of it they hold; past that it's "at least" (`heldMore`).
 */
export const heldItemLimit = 100;

export type Held = { held: number; heldMore: boolean };

/** The Items made from an entry that a person still owns. */
const ownedItemsOf = (
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) =>
  ctx.db
    .query("items")
    .withIndex("by_ownerId_and_catalogEntryId_and_soldOn", (q) =>
      q
        .eq("ownerId", ownerId)
        .eq("catalogEntryId", entryId)
        .eq("soldOn", undefined),
    );

/** Whether a person still owns any Item made from a Catalog entry. */
export async function holdsAny(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
) {
  return (await ownedItemsOf(ctx, ownerId, entryId).first()) !== null;
}

/**
 * How many pieces of a Catalog entry a person holds: the Quantity of the
 * Items made from it that they still own, over at most `heldItemLimit` of
 * them. `heldMore` says there are more Items than were counted, so they hold
 * at least `held`.
 */
export async function heldCount(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  entryId: Id<"catalogNodes">,
): Promise<Held> {
  return heldOf(
    await ownedItemsOf(ctx, ownerId, entryId).take(heldItemLimit + 1),
  );
}

/**
 * How many Items made from a Catalog entry a person still owns besides
 * `item`, counting no further than `heldItemLimit`.
 */
export async function otherItemsOf(
  ctx: QueryCtx,
  item: Doc<"items">,
  entryId: Id<"catalogNodes">,
) {
  return othersOf(
    await ownedItemsOf(ctx, item.ownerId, entryId).take(heldItemLimit + 1),
    item._id,
  );
}

/** `heldCount` from the owned Items read, up to `heldItemLimit` + 1 of them. */
export function heldOf(owned: readonly { quantity: number }[]): Held {
  return {
    held: owned
      .slice(0, heldItemLimit)
      .reduce((pieces, item) => pieces + item.quantity, 0),
    heldMore: owned.length > heldItemLimit,
  };
}

/** `otherItemsOf` from the owned Items read, up to `heldItemLimit` + 1 of them. */
export function othersOf(
  owned: readonly { _id: string }[],
  itemId: string,
): number {
  return Math.min(
    heldItemLimit,
    owned.filter((other) => other._id !== itemId).length,
  );
}
