import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { countItemRetyped } from "../collectionCounts";
import {
  entryDetails,
  entryFacts,
  withCatalogFacts,
} from "../items/catalogFacts";
import type { ItemType } from "../items/grades";
import { fieldSuits, typeOnlyFields } from "../items/rules";

/**
 * What Catalog changes do to the Items linked to an entry (ADR 0001). Their
 * descriptive facts are read from the entry, so most corrections reach them
 * by themselves; these are the changes that have to touch the Items:
 * a new Item type, and the entry leaving the Catalog.
 */

const linkedTo = (ctx: QueryCtx, entryId: Id<"catalogNodes">) =>
  ctx.db
    .query("items")
    .withIndex("by_catalogEntryId", (q) => q.eq("catalogEntryId", entryId));

/** How many Items link to an entry, counting no further than `limit` + 1. */
export async function countLinkedItems(
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
  limit: number,
) {
  return (await linkedTo(ctx, entryId).take(limit + 1)).length;
}

/** Whether any Item links to an entry. */
export async function hasLinkedItems(
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
) {
  return (await linkedTo(ctx, entryId).first()) !== null;
}

/**
 * Gives the entry's new Item type to every Item linked to it, dropping what
 * the Item held that the type has no place for, and keeps each owner's
 * Collection counts right.
 */
export async function retypeLinkedItems(
  ctx: MutationCtx,
  entryId: Id<"catalogNodes">,
  type: ItemType,
) {
  for await (const item of linkedTo(ctx, entryId)) {
    if (item.type === type) continue;
    const unsuited = Object.fromEntries(
      (Object.keys(typeOnlyFields) as Array<keyof typeof typeOnlyFields>)
        .filter(
          (field) => item[field] !== undefined && !fieldSuits(field, type),
        )
        .map((field) => [field, undefined]),
    );
    await ctx.db.patch("items", item._id, { type, ...unsuited });
    await countItemRetyped(ctx, item.ownerId, item.type, type);
  }
}

/**
 * Before an entry leaves the Catalog: each Item linked to it takes the
 * entry's facts as its own, keeping those the person changed, keeps a copy
 * of the facts it has no field for, and stops linking to it. Nobody's Item
 * loses a fact.
 */
export async function detachLinkedItems(
  ctx: MutationCtx,
  entry: Doc<"catalogNodes">,
) {
  const facts = entryFacts(entry);
  const details = entryDetails(entry);
  const catalogDetails = Object.keys(details).length > 0 ? details : undefined;
  for await (const item of linkedTo(ctx, entry._id)) {
    await ctx.db.patch("items", item._id, {
      ...withCatalogFacts(item, facts),
      catalogDetails,
      catalogEntryId: undefined,
    });
  }
}
