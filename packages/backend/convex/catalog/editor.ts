import { locales } from "@coinslite/i18n";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, mutation, query } from "../_generated/server";
import { requireAdmin } from "../utils/auth";
import {
  catalogItemType,
  catalogKind,
  coinEdge,
  material,
  preciousMetal,
  provenance,
  strike,
} from "../utils/validators";
import { ancestorNodesOf, nodeByKey } from "./browse";
import {
  changeAround,
  changeAt,
  changeOver,
  deletionTooLarge,
  planDeletion,
  startDeletion,
} from "./changes";
import {
  type CatalogError,
  type EditorValues,
  type FileRow,
  type TranslationValueKey,
  catalogErrors,
  editorValueKeys,
  readCatalogKey,
  readEditorValues,
  translationValuesOf,
  valuesFromFields,
} from "./fields";
import { applyPlan, planRows } from "./tree";

/**
 * The admins' Catalog editor: the whole tree, node by node, where they add
 * countries, Themes, groupings and Catalog entries, correct any of their
 * values and delete them. A save goes through the same plan as a CSV import
 * (catalog/tree.ts), so paths, entry counts, countries and search words stay
 * right, and the same rules apply. Deleting a node, and giving the Items
 * linked to an entry its new Item type, run in the background when they
 * reach many Items (catalog/changes.ts); the tree shows each such change
 * while it runs, and nothing it runs on can be edited meanwhile.
 */

const optionalText = v.optional(v.string());
const optionalNumber = v.optional(v.number());

/** Every value the editor sets (fields.ts `editorValueKeys`); one left out is cleared. */
const editorValues = v.object({
  title: v.string(),
  sortOrder: v.number(),
  itemType: v.optional(catalogItemType),
  country: optionalText,
  denomination: optionalText,
  series: optionalText,
  material: v.optional(material),
  strike: v.optional(strike),
  metal: v.optional(preciousMetal),
  weight: optionalNumber,
  fineness: optionalNumber,
  diameter: optionalNumber,
  yearFrom: optionalNumber,
  yearTo: optionalNumber,
  mint: optionalText,
  mintMark: optionalText,
  composition: optionalText,
  edge: v.optional(coinEdge),
  edgeLettering: optionalText,
  thickness: optionalNumber,
  width: optionalNumber,
  height: optionalNumber,
  designers: optionalText,
  mintage: optionalNumber,
  issueDate: optionalText,
  withdrawalDate: optionalText,
  notesLanguage: optionalText,
  technicalDetails: optionalText,
  historicalNotes: optionalText,
  numistaId: optionalNumber,
  factsSource: optionalText,
  factsAuthor: optionalText,
  factsLicence: optionalText,
  factsLink: optionalText,
  notesSource: optionalText,
  notesAuthor: optionalText,
  notesLicence: optionalText,
  notesLink: optionalText,
  ...(Object.fromEntries(
    translationValuesOf(locales).map((key) => [key, optionalText]),
  ) as Record<TranslationValueKey, typeof optionalText>),
});

/** A saved node stands in a plan as the only row of a file. */
const editorRow = 2;

export const catalogEditorErrors = {
  /** No Catalog node has the key. */
  nodeNotFound: "CATALOG_NODE_NOT_FOUND",
  /** The node takes more nodes with it than one delete may. */
  deleteTooLarge: "DELETE_TOO_LARGE",
} as const;

async function requireNode(ctx: QueryCtx, key: string) {
  const node = await nodeByKey(ctx, key);
  if (!node) throw new ConvexError(catalogEditorErrors.nodeNotFound);
  return node;
}

/** A stored node's values as the editor shows them. */
function editorValuesOf(node: Doc<"catalogNodes">): EditorValues {
  const values = valuesFromFields(node);
  const shown: Record<string, unknown> = {};
  for (const key of editorValueKeys) {
    if (values[key] !== undefined) shown[key] = values[key];
  }
  return shown as EditorValues;
}

/** The nodes above one, root first, by key and title. */
const ancestorsOf = async (ctx: QueryCtx, node: Doc<"catalogNodes">) =>
  (await ancestorNodesOf(ctx, node)).map(({ key, title }) => ({ key, title }));

/**
 * Saves one node through the import's plan: the values as given (one left
 * out is cleared), the image as it is. Throws the first problem's code.
 */
async function saveRow(
  ctx: Parameters<typeof applyPlan>[0],
  row: Omit<FileRow, "row" | "values">,
  input: EditorValues,
) {
  const { values, problems } = readEditorValues(input);
  const plan = await planRows(ctx, {
    rows: [{ ...row, row: editorRow, values }],
    errors: problems.map((problem) => ({ row: editorRow, ...problem })),
  });
  const first = plan.report.errors[0];
  if (first) throw new ConvexError(first.code as CatalogError);
  await applyPlan(ctx, plan);
}

/**
 * Adds a node: a root (a country when it has one, otherwise a Theme) when
 * `parentKey` is null, else a child, which is a Catalog entry when `addable`
 * and a grouping otherwise. Returns its key.
 */
export const create = mutation({
  args: {
    parentKey: v.union(v.string(), v.null()),
    key: v.string(),
    addable: v.boolean(),
    values: editorValues,
  },
  returns: v.string(),
  handler: async (ctx, { parentKey, key: typedKey, addable, values }) => {
    await requireAdmin(ctx);
    const key = readCatalogKey(typedKey);
    if (key === undefined)
      throw new ConvexError(
        typedKey.trim() ? catalogErrors.invalidId : catalogErrors.idRequired,
      );
    if (await nodeByKey(ctx, key))
      throw new ConvexError(catalogErrors.duplicateId);
    await saveRow(ctx, { key, parentKey, addable }, values);
    return key;
  },
});

/** A change running in the background on a node: being deleted, or its Items taking its new Item type. */
const runningChange = v.union(v.literal("delete"), v.literal("retype"));

const treeRow = v.object({
  key: v.string(),
  kind: catalogKind,
  title: v.string(),
  sortOrder: v.number(),
  itemType: v.optional(catalogItemType),
  country: v.optional(v.string()),
  yearFrom: v.optional(v.number()),
  yearTo: v.optional(v.number()),
  /** Roots and groupings: the Catalog entries anywhere below. */
  entryCount: v.optional(v.number()),
  /** A change running on the node itself, if any. */
  change: v.optional(runningChange),
});

const treeRowOf = (
  node: Doc<"catalogNodes">,
  change: Doc<"catalogChanges"> | null,
) => ({
  key: node.key,
  kind: node.kind,
  title: node.title,
  sortOrder: node.sortOrder,
  ...(node.itemType !== undefined && { itemType: node.itemType }),
  ...(node.country !== undefined && { country: node.country }),
  ...(node.yearFrom !== undefined && { yearFrom: node.yearFrom }),
  ...(node.yearTo !== undefined && { yearTo: node.yearTo }),
  ...(node.kind !== "entry" && { entryCount: node.entryCount ?? 0 }),
  ...(change && { change: change.kind }),
});

/** The nodes right below one, or the roots when `parentKey` is null, in sort order. */
export const children = query({
  args: {
    parentKey: v.union(v.string(), v.null()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(treeRow),
  handler: async (ctx, { parentKey, paginationOpts }) => {
    await requireAdmin(ctx);
    const parent = parentKey === null ? null : await nodeByKey(ctx, parentKey);
    if (parentKey !== null && !parent)
      return { page: [], isDone: true, continueCursor: "" };
    const page = await ctx.db
      .query("catalogNodes")
      .withIndex("by_parentId_and_sortOrder", (q) =>
        q.eq("parentId", parent?._id),
      )
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (node) =>
          treeRowOf(node, await changeAt(ctx, node.path)),
        ),
      ),
    };
  },
});

/**
 * Changes a node's values, and whether a child is a Catalog entry
 * (`addable`). A root's country decides whether it is a country or a Theme.
 * Its place in the tree and its image stay as they are.
 */
export const update = mutation({
  args: { key: v.string(), addable: v.boolean(), values: editorValues },
  returns: v.null(),
  handler: async (ctx, { key, addable, values }) => {
    await requireAdmin(ctx);
    const node = await requireNode(ctx, key);
    await saveRow(ctx, { key: node.key, addable }, values);
    return null;
  },
});

/** A node with everything the editor shows and changes; null when no node has the key. */
export const node = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      kind: catalogKind,
      /** Null for a root. */
      parentKey: v.union(v.string(), v.null()),
      ancestors: v.array(v.object({ key: v.string(), title: v.string() })),
      values: editorValues,
      /** The image at full size, if it has one: uploaded, or linked from a CSV file. */
      imageUrl: v.optional(v.string()),
      imageProvenance: v.optional(provenance),
      /** A change running on the node or above it: it can't be saved until that's done. */
      change: v.optional(runningChange),
    }),
  ),
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const node = await nodeByKey(ctx, key);
    if (!node) return null;
    const ancestors = await ancestorsOf(ctx, node);
    const change = await changeOver(ctx, node.path);
    const imageUrl = node.imageFiles
      ? await ctx.storage.getUrl(node.imageFiles.full)
      : node.imageUrl;
    return {
      key: node.key,
      kind: node.kind,
      parentKey: ancestors.at(-1)?.key ?? null,
      ancestors,
      values: editorValuesOf(node),
      ...(imageUrl && { imageUrl }),
      ...(node.imageProvenance && { imageProvenance: node.imageProvenance }),
      ...(change && { change: change.kind }),
    };
  },
});

/**
 * What deleting a node would take with it, for the admin to see first: how
 * many nodes below it go too, and how many Items link to it or to entries
 * below (they keep those entries' facts as their own). Null when no node has
 * the key.
 */
export const deletion = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      nodesBelow: v.number(),
      /** Counted up to `catalogLimits.linkedItems`. */
      linkedItems: v.number(),
      /** More Items link there than were counted. */
      moreLinkedItems: v.boolean(),
      /** More than one delete may take: delete what's below first. */
      tooLarge: v.boolean(),
      /** A deletion or Item type change is running on it, above or below it: wait until it's done. */
      inProgress: v.boolean(),
    }),
  ),
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const node = await nodeByKey(ctx, key);
    if (!node) return null;
    const inProgress = (await changeAround(ctx, node.path)) !== null;
    return { ...(await planDeletion(ctx, node)), inProgress };
  },
});

/**
 * Deletes a node and everything below it. Items linked to entries there
 * keep those entries' facts as their own, so nobody's Item loses a fact.
 * True once it's gone; false while the rest goes in the background, when
 * it reaches many Items.
 */
export const remove = mutation({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const node = await requireNode(ctx, key);
    if (await changeAround(ctx, node.path))
      throw new ConvexError(catalogErrors.changeInProgress);
    if (await deletionTooLarge(ctx, node))
      throw new ConvexError(catalogEditorErrors.deleteTooLarge);
    return await startDeletion(ctx, node);
  },
});
