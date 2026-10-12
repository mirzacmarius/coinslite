/**
 * Catalog changes that reach many Items (catalog/changes.ts): deleting a
 * node with everything below it, and giving an entry another Item type.
 * They run a batch per transaction, as Album and account deletion do. Pure:
 * what one batch does, and when the change is done.
 */

import type { ItemType } from "../items/grades";
import { fieldSuits, typeOnlyFields } from "../items/rules";

/** A node still to delete, with how many Items link to it and how many wants name it, as read. */
export type NodeLeft<Id> = { id: Id; linkedItems: number; wants: number };

/** What one batch does to one node: detaches some of its Items, clears some of its wants, maybe deletes it. */
export type DeletionStep<Id> = {
  id: Id;
  detach: number;
  clearWants: number;
  remove: boolean;
};

/**
 * One batch of a deletion. `left` lists nodes in the order they go, the
 * deepest first and the deleted node last, each counted at most a little
 * past what the batch can take; `complete` says whether it lists every node
 * left. Each detached Item, cleared want and deleted node costs one of the
 * `budget`. A node goes only once its Items are detached and its wants
 * cleared, so no Item links to a deleted entry. Done once every node is
 * gone.
 */
export function planDeletionBatch<Id>(
  left: ReadonlyArray<NodeLeft<Id>>,
  { complete, budget }: { complete: boolean; budget: number },
): { steps: DeletionStep<Id>[]; done: boolean } {
  let room = budget;
  const steps: DeletionStep<Id>[] = [];
  for (const { id, linkedItems, wants } of left) {
    const detach = Math.min(linkedItems, room);
    room -= detach;
    const clearWants = detach < linkedItems ? 0 : Math.min(wants, room);
    room -= clearWants;
    const remove = detach === linkedItems && clearWants === wants && room >= 1;
    if (remove) room -= 1;
    if (detach > 0 || clearWants > 0 || remove)
      steps.push({ id, detach, clearWants, remove });
    if (!remove) return { steps, done: false };
  }
  return { steps, done: complete };
}

type TypeOnlyField = keyof typeof typeOnlyFields;

/** An Item linked to an entry being retyped, as read. */
type LinkedItem<Id> = {
  _id: Id;
  _creationTime: number;
  type: ItemType;
} & Partial<Record<TypeOnlyField, unknown>>;

/** What an Item takes on with a new Item type: the type, and dropping what it held that the type has no place for. */
export function retypedFields(item: LinkedItem<unknown>, type: ItemType) {
  const fields: { type: ItemType } & Partial<Record<TypeOnlyField, undefined>> =
    { type };
  for (const field of Object.keys(typeOnlyFields) as TypeOnlyField[]) {
    if (item[field] !== undefined && !fieldSuits(field, type))
      fields[field] = undefined;
  }
  return fields;
}

/**
 * One batch of giving an entry's linked Items its new Item type. `items`
 * are read in the order they were added, from the last one the previous
 * batch read (`after`), at most one past the `budget`. Items already of the
 * type, added since or retyped before, are passed over. Done once the batch
 * reads to the end.
 */
export function planRetypeBatch<Id>(
  items: ReadonlyArray<LinkedItem<Id>>,
  { type, budget }: { type: ItemType; budget: number },
) {
  const read = items.slice(0, budget);
  return {
    retype: read
      .filter((item) => item.type !== type)
      .map((item) => ({ id: item._id, fields: retypedFields(item, type) })),
    after: read.at(-1)?._creationTime,
    done: items.length <= budget,
  };
}

/** Whether the node at `path` is the one at `root` or below it. */
export const isWithin = (path: string, root: string) =>
  path === root || path.startsWith(`${root}/`);

/**
 * Whether a change running at `changePath` keeps a write from happening
 * meanwhile: one that writes the node there or below it, adds or moves a
 * node there, or moves or deletes a node above it. `from` is the written
 * node's path before (none for a new node), `to` its path after (none when
 * it's deleted).
 */
export function changeBlocks(
  changePath: string,
  { from, to }: { from?: string; to?: string },
) {
  if (to !== undefined && isWithin(to, changePath)) return true;
  if (from === undefined) return false;
  if (isWithin(from, changePath)) return true;
  return from !== to && isWithin(changePath, from);
}
