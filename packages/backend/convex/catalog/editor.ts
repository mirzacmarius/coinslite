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
  material,
  preciousMetal,
  provenance,
  strike,
} from "../utils/validators";
import {
  type CatalogError,
  type EditorValues,
  type FileRow,
  catalogErrors,
  editorValueKeys,
  readCatalogKey,
  readEditorValues,
  valuesFromFields,
} from "./fields";
import { applyPlan, planRows } from "./tree";

/**
 * The admins' Catalog editor: the whole tree, node by node, where they add
 * countries, Themes, groupings and Catalog entries, correct any of their
 * values and delete them. A save goes through the same plan as a CSV import
 * (catalog/tree.ts), so paths, entry counts, countries and search words stay
 * right, and the same rules apply.
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
});

/** A saved node stands in a plan as the only row of a file. */
const editorRow = 2;

export const catalogEditorErrors = {
  /** No Catalog node has the key. */
  nodeNotFound: "CATALOG_NODE_NOT_FOUND",
} as const;

async function nodeByKey(ctx: QueryCtx, key: string) {
  return await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

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

/** The nodes above one, root first. */
async function ancestorsOf(ctx: QueryCtx, node: Doc<"catalogNodes">) {
  const ancestors = [];
  for (const key of node.path.split("/").slice(0, -1)) {
    const ancestor = await nodeByKey(ctx, key);
    if (ancestor) ancestors.push({ key: ancestor.key, title: ancestor.title });
  }
  return ancestors;
}

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
});

const treeRowOf = (node: Doc<"catalogNodes">) => ({
  key: node.key,
  kind: node.kind,
  title: node.title,
  sortOrder: node.sortOrder,
  ...(node.itemType !== undefined && { itemType: node.itemType }),
  ...(node.country !== undefined && { country: node.country }),
  ...(node.yearFrom !== undefined && { yearFrom: node.yearFrom }),
  ...(node.yearTo !== undefined && { yearTo: node.yearTo }),
  ...(node.kind !== "entry" && { entryCount: node.entryCount ?? 0 }),
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
    return { ...page, page: page.page.map(treeRowOf) };
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
    }),
  ),
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const node = await nodeByKey(ctx, key);
    if (!node) return null;
    const ancestors = await ancestorsOf(ctx, node);
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
    };
  },
});
