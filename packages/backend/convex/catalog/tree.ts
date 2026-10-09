import type { PaginationOptions } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  type CatalogItemType,
  type CatalogKind,
  type FileRow,
  type NodeValues,
  type RowError,
  catalogCsvHeader,
  catalogErrors,
  catalogLimits,
  checkNode,
  csvRecordOf,
  fieldsFromValues,
  kindOf,
  readCatalogFile,
  sameValues,
  searchTextOf,
  valuesFromFields,
} from "./fields";
import {
  countLinkedItems,
  detachLinkedItems,
  hasLinkedItems,
  retypeLinkedItems,
} from "./linkedItems";

/**
 * The Catalog tree: where each node sits, and bringing a whole CSV file in at
 * once. Every write here keeps `path` (the keys from the root down) and
 * `searchText` in step with the node, so browsing, Sets and search can rely
 * on them.
 */

/** What an import does, or would do. */
export type ImportReport = {
  inserts: number;
  updates: number;
  unchanged: number;
  errorCount: number;
  /** The first problems, by row; `errorCount` has them all. */
  errors: RowError[];
};

const reportedErrors = 100;

/** A node as the file leaves it. */
type Planned = {
  row: number;
  key: string;
  existing: Doc<"catalogNodes"> | null;
  parentKey: string | null;
  kind: CatalogKind;
  values: NodeValues;
};

export type Plan = {
  report: ImportReport;
  /** Rows in file order. */
  planned: Planned[];
  /** Where each node referred to ends up. */
  pathOf: (key: string) => string;
  /** Catalog nodes the file refers to, by key. */
  stored: Map<string, Doc<"catalogNodes">>;
  /** Entries given another Item type, which the Items linked to them take too. */
  retyped: Array<{ entryId: Id<"catalogNodes">; type: CatalogItemType }>;
};

const segments = (path: string) => path.split("/");
const parentKeyOf = (path: string) => segments(path).at(-2) ?? null;
/** The keys of the nodes above the one at `path`, root first. */
const ancestorKeysOf = (path: string) => segments(path).slice(0, -1);

/**
 * The key of the country a node at `path` is browsed under: its country root,
 * or below a Theme, the Theme's child (2-euro commemoratives › Germany).
 */
export function countryNodeKeyOf(path: string, rootKind: CatalogKind) {
  const keys = segments(path);
  return rootKind === "theme" ? keys[1] : keys[0];
}

/** The fields browsing reads that follow from a node's place in the tree. */
type BrowseFields = { entryCount?: number; countryNodeKey?: string };

const browseFieldsChanged = (node: Doc<"catalogNodes">, fields: BrowseFields) =>
  node.entryCount !== fields.entryCount ||
  node.countryNodeKey !== fields.countryNodeKey;

/**
 * Works out every node's browse fields afresh from the whole Catalog and
 * stores the ones that differ. Imports keep them in step as they go; this
 * fills them in for Catalog data stored before they existed.
 */
export async function refreshBrowseFields(ctx: MutationCtx) {
  const nodes: Doc<"catalogNodes">[] = [];
  for await (const node of ctx.db.query("catalogNodes").withIndex("by_path")) {
    nodes.push(node);
  }
  const kinds = new Map(nodes.map((node) => [node.key, node.kind]));
  const entryCounts = new Map<string, number>();
  for (const node of nodes) {
    if (node.kind !== "entry") continue;
    for (const key of ancestorKeysOf(node.path)) {
      entryCounts.set(key, (entryCounts.get(key) ?? 0) + 1);
    }
  }
  for (const node of nodes) {
    const rootKind = kinds.get(segments(node.path)[0] as string) ?? node.kind;
    const fields: BrowseFields = {
      entryCount:
        node.kind === "entry" ? undefined : entryCounts.get(node.key) ?? 0,
      countryNodeKey: countryNodeKeyOf(node.path, rootKind),
    };
    if (browseFieldsChanged(node, fields)) {
      await ctx.db.patch("catalogNodes", node._id, fields);
    }
  }
}

async function nodeByKey(ctx: QueryCtx, key: string) {
  return await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

/**
 * Works out what bringing rows into the Catalog would change: a CSV file's,
 * or the one node the Catalog editor saves. Each row updates the node with
 * its key, or adds one.
 */
export async function planRows(
  ctx: QueryCtx,
  file: { rows: FileRow[]; errors: RowError[] },
): Promise<Plan> {
  const errors = [...file.errors];
  const rows = new Map(file.rows.map((row) => [row.key, row]));

  // The nodes the file names, then the parents they end up under.
  const stored = new Map<string, Doc<"catalogNodes">>();
  const load = async (keys: Iterable<string>) => {
    for (const key of keys) {
      if (stored.has(key)) continue;
      const node = await nodeByKey(ctx, key);
      if (node) stored.set(key, node);
    }
  };
  await load(rows.keys());
  const planned = new Map<string, Planned>();
  for (const row of file.rows) {
    planned.set(row.key, merge(row, stored.get(row.key) ?? null));
  }
  await load(
    [...planned.values()].flatMap(({ parentKey }) =>
      parentKey === null || planned.has(parentKey) ? [] : [parentKey],
    ),
  );

  // Where each node ends up: its parent's path plus its key. A stored node
  // the file doesn't mention moves with the nearest ancestor the file does.
  const paths = new Map<string, string>();
  const inCycle = new Set<string>();
  const visiting: string[] = [];
  const pathOf = (key: string): string => {
    const known = paths.get(key);
    if (known !== undefined) return known;
    if (visiting.includes(key)) {
      for (const member of visiting.slice(visiting.indexOf(key)))
        inCycle.add(member);
      return key;
    }
    visiting.push(key);
    let path: string;
    const node = planned.get(key);
    if (node) {
      const parentKnown =
        node.parentKey !== null &&
        (planned.has(node.parentKey) || stored.has(node.parentKey));
      path = parentKnown ? `${pathOf(node.parentKey as string)}/${key}` : key;
    } else {
      const storedPath = stored.get(key)?.path ?? key;
      const parts = segments(storedPath);
      const ancestors = parts.slice(0, -1);
      const moved = ancestors.filter((part) => planned.has(part)).at(-1);
      path =
        moved === undefined
          ? storedPath
          : [
              pathOf(moved),
              ...parts.slice(ancestors.lastIndexOf(moved) + 1),
            ].join("/");
    }
    visiting.pop();
    paths.set(key, path);
    return path;
  };

  const kindOfKey = (key: string) =>
    planned.get(key)?.kind ?? stored.get(key)?.kind;

  /** Entries whose Item type changes, for their linked Items to follow. */
  const retyped: Plan["retyped"] = [];
  let linkedItemsToRetype = 0;
  for (const node of planned.values()) {
    // One problem per cell: a cell that couldn't be read isn't reported again.
    const fail = (code: RowError["code"], column?: string) => {
      const reported = errors.some(
        (error) => error.row === node.row && error.column === column,
      );
      if (!reported) errors.push({ row: node.row, column, code });
    };
    const row = rows.get(node.key) as FileRow;

    if (node.parentKey !== null) {
      if (kindOfKey(node.parentKey) === undefined) {
        fail(catalogErrors.parentNotFound, "parent_id");
      } else if (kindOfKey(node.parentKey) === "entry") {
        fail(catalogErrors.parentIsEntry, "parent_id");
      }
    } else if (row.addable) {
      fail(catalogErrors.rootNotAddable, "is_addable");
    }

    pathOf(node.key);
    if (inCycle.has(node.key)) fail(catalogErrors.parentCycle, "parent_id");
    else if (segments(pathOf(node.key)).length > catalogLimits.depth)
      fail(catalogErrors.tooDeep, "parent_id");

    for (const problem of checkNode(node.values, node.kind, {
      uploadedImage: keepsUploadedImage(node),
    })) {
      fail(problem.code, problem.column);
    }

    // A node becoming an entry can't keep the children it has.
    if (
      node.kind === "entry" &&
      node.existing &&
      node.existing.kind !== "entry"
    ) {
      for await (const child of ctx.db
        .query("catalogNodes")
        .withIndex("by_parentId_and_sortOrder", (q) =>
          q.eq("parentId", node.existing?._id),
        )) {
        const childAfter = planned.get(child.key);
        const parentAfter = childAfter ? childAfter.parentKey : node.key;
        if (parentAfter === node.key) {
          fail(catalogErrors.entryHasChildren, "is_addable");
          break;
        }
      }
    }

    // Items link to entries (ADR 0001): an entry they link to stays one, and
    // a new Item type reaches them, as many as one save can update.
    if (node.existing?.kind === "entry") {
      const entryId = node.existing._id;
      if (node.kind !== "entry") {
        if (await hasLinkedItems(ctx, entryId))
          fail(catalogErrors.entryHasItems, "is_addable");
      } else if (
        node.values.itemType !== undefined &&
        node.values.itemType !== (node.existing.itemType ?? "coin")
      ) {
        linkedItemsToRetype += await countLinkedItems(
          ctx,
          entryId,
          Math.max(0, catalogLimits.linkedItems - linkedItemsToRetype),
        );
        if (linkedItemsToRetype > catalogLimits.linkedItems)
          fail(catalogErrors.tooManyLinkedItems, "item_type");
        else retyped.push({ entryId, type: node.values.itemType });
      }
    }
  }

  // Counts cover the rows that would go in once the file has no problems.
  const rowsWithErrors = new Set(errors.map((error) => error.row));
  const changes = [...planned.values()]
    .filter((node) => !rowsWithErrors.has(node.row))
    .map((node) => {
      if (!node.existing) return "insert";
      const same =
        node.kind === node.existing.kind &&
        pathOf(node.key) === node.existing.path &&
        sameValues(node.values, valuesFromFields(node.existing));
      return same ? "unchanged" : "update";
    });
  errors.sort((a, b) => a.row - b.row);
  return {
    report: {
      inserts: changes.filter((change) => change === "insert").length,
      updates: changes.filter((change) => change === "update").length,
      unchanged: changes.filter((change) => change === "unchanged").length,
      errorCount: errors.length,
      errors: errors.slice(0, reportedErrors),
    },
    planned: [...planned.values()],
    pathOf,
    stored,
    retyped,
  };
}

/**
 * Whether a node keeps the image an admin uploaded for it: files don't carry
 * uploaded images, so it stays unless the file links another image instead.
 */
const keepsUploadedImage = (node: Planned) =>
  node.existing?.imageFiles !== undefined && node.values.imageUrl === undefined;

/** A file row laid over the node it updates, if any. */
function merge(row: FileRow, existing: Doc<"catalogNodes"> | null): Planned {
  const before: Partial<NodeValues> = existing
    ? valuesFromFields(existing)
    : {};
  const values = { sortOrder: 0, ...before, ...row.values } as NodeValues;
  const parentKey =
    row.parentKey !== undefined
      ? row.parentKey
      : existing
        ? parentKeyOf(existing.path)
        : null;
  const addable = row.addable ?? existing?.kind === "entry";
  return {
    row: row.row,
    key: row.key,
    existing,
    parentKey,
    kind: kindOf({ parentKey, country: values.country, addable }),
    values,
  };
}

/** What importing a file would change, without changing anything. */
export async function previewImport(ctx: QueryCtx, csv: string) {
  return (await planRows(ctx, readCatalogFile(csv))).report;
}

/**
 * Imports a Catalog CSV file: rows with a known id update that node, the rest
 * are inserted, and parent_id may name any node in the file or the Catalog.
 * A file with any problem changes nothing.
 */
export async function importCatalogFile(
  ctx: MutationCtx,
  csv: string,
): Promise<ImportReport & { applied: boolean }> {
  return await applyPlan(ctx, await planRows(ctx, readCatalogFile(csv)));
}

/**
 * Makes the changes a plan works out, keeping every node's path, entry count,
 * country and search words right. A plan with any problem changes nothing.
 */
export async function applyPlan(
  ctx: MutationCtx,
  { report, planned, pathOf, stored, retyped }: Plan,
): Promise<ImportReport & { applied: boolean }> {
  if (report.errorCount > 0) return { ...report, applied: false };

  const ids = new Map<string, Id<"catalogNodes">>(
    [...stored].map(([key, node]) => [key, node._id]),
  );
  const plannedKinds = new Map(planned.map((node) => [node.key, node.kind]));
  /** What the root of a path is once the file is in: a country or a Theme. */
  const rootKindOf = async (path: string) => {
    const rootKey = segments(path)[0] as string;
    const kind = plannedKinds.get(rootKey) ?? stored.get(rootKey)?.kind;
    if (kind !== undefined) return kind;
    const root = await nodeByKey(ctx, rootKey);
    if (root) stored.set(rootKey, root);
    return root?.kind ?? "country";
  };

  // Each root and grouping counts the entries below it. A node's count
  // changes by the entries that leave or join the paths below it.
  const entryCountChanges = new Map<string, number>();
  const countEntry = (path: string, isEntry: boolean, change: 1 | -1) => {
    if (!isEntry) return;
    for (const key of ancestorKeysOf(path)) {
      entryCountChanges.set(key, (entryCountChanges.get(key) ?? 0) + change);
    }
  };

  const depth = (node: Planned) => segments(pathOf(node.key)).length;
  /** Where nodes the file doesn't mention may have to follow: old paths of moved nodes, roots that changed kind. */
  const refresh: string[] = [];
  for (const node of [...planned].sort((a, b) => depth(a) - depth(b))) {
    const path = pathOf(node.key);
    const keptCount =
      node.existing && node.existing.kind !== "entry"
        ? node.existing.entryCount ?? 0
        : 0;
    const countryNodeKey = countryNodeKeyOf(path, await rootKindOf(path));
    const imageFiles = node.existing?.imageFiles;
    const document = {
      key: node.key,
      kind: node.kind,
      path,
      ...(node.parentKey !== null && { parentId: ids.get(node.parentKey) }),
      ...fieldsFromValues(node.values),
      ...(imageFiles && keepsUploadedImage(node) && { imageFiles }),
      searchText: searchTextOf(node.values),
      ...(node.kind !== "entry" && { entryCount: keptCount }),
      ...(countryNodeKey !== undefined && { countryNodeKey }),
    };
    countEntry(path, node.kind === "entry", 1);
    if (!node.existing) {
      ids.set(node.key, await ctx.db.insert("catalogNodes", document));
      continue;
    }
    if (imageFiles && !keepsUploadedImage(node)) {
      // The file links another image in place of the uploaded one.
      await ctx.storage.delete(imageFiles.full);
      await ctx.storage.delete(imageFiles.thumbnail);
    }
    countEntry(node.existing.path, node.existing.kind === "entry", -1);
    if (node.existing.path !== path) refresh.push(node.existing.path);
    else if (node.parentKey === null && node.existing.kind !== node.kind)
      refresh.push(path);
    await ctx.db.replace("catalogNodes", node.existing._id, document);
  }

  // Nodes the file doesn't mention move along with their moved ancestors,
  // and follow their root when it turns from a country into a Theme.
  const inFile = new Set(planned.map((node) => node.key));
  const below = new Map<string, Doc<"catalogNodes">>();
  for (const oldPath of refresh) {
    for await (const node of ctx.db
      .query("catalogNodes")
      .withIndex("by_path", (q) =>
        q.gt("path", `${oldPath}/`).lt("path", `${oldPath}0`),
      )) {
      if (!inFile.has(node.key)) below.set(node.key, node);
    }
  }
  for (const node of below.values()) stored.set(node.key, node);
  for (const node of below.values()) {
    const path = pathOf(node.key);
    const countryNodeKey = countryNodeKeyOf(path, await rootKindOf(path));
    countEntry(node.path, node.kind === "entry", -1);
    countEntry(path, node.kind === "entry", 1);
    if (path !== node.path || countryNodeKey !== node.countryNodeKey)
      await ctx.db.patch("catalogNodes", node._id, { path, countryNodeKey });
  }

  for (const [key, change] of entryCountChanges) {
    if (change === 0) continue;
    const id = ids.get(key) ?? (await nodeByKey(ctx, key))?._id;
    const node = id && (await ctx.db.get("catalogNodes", id));
    if (!node || node.kind === "entry") continue;
    await ctx.db.patch("catalogNodes", node._id, {
      entryCount: (node.entryCount ?? 0) + change,
    });
  }

  for (const { entryId, type } of retyped) {
    await retypeLinkedItems(ctx, entryId, type);
  }
  return { ...report, applied: true };
}

/** A page of the Catalog as CSV, parents before their children; the first page starts with the header. */
export async function exportCatalogPage(
  ctx: QueryCtx,
  paginationOpts: PaginationOptions,
) {
  const page = await ctx.db
    .query("catalogNodes")
    .withIndex("by_path")
    .paginate(paginationOpts);
  const lines = page.page.map((node) =>
    csvRecordOf({
      key: node.key,
      parentKey: parentKeyOf(node.path),
      kind: node.kind,
      values: valuesFromFields(node),
    }),
  );
  return {
    csv:
      (paginationOpts.cursor === null ? catalogCsvHeader : "") + lines.join(""),
    isDone: page.isDone,
    continueCursor: page.continueCursor,
  };
}

/** What deleting a node takes with it. */
export type Deletion = {
  /** Every node below it, root first; at most `catalogLimits.deleteNodes`. */
  below: Doc<"catalogNodes">[];
  /** Items linked to it or to the entries below it, counted up to just past the limit. */
  linkedItems: number;
  /** Whether it takes more nodes or Items than one delete may. */
  tooLarge: boolean;
};

/** Works out what deleting a node would take with it, without changing anything. */
export async function planDeletion(
  ctx: QueryCtx,
  node: Doc<"catalogNodes">,
): Promise<Deletion> {
  const below = await ctx.db
    .query("catalogNodes")
    .withIndex("by_path", (q) =>
      q.gt("path", `${node.path}/`).lt("path", `${node.path}0`),
    )
    .take(catalogLimits.deleteNodes);
  let linkedItems = 0;
  for (const each of [node, ...below]) {
    if (each.kind !== "entry") continue;
    linkedItems += await countLinkedItems(
      ctx,
      each._id,
      catalogLimits.linkedItems - linkedItems,
    );
    if (linkedItems > catalogLimits.linkedItems) break;
  }
  return {
    below,
    linkedItems,
    tooLarge:
      below.length + 1 > catalogLimits.deleteNodes ||
      linkedItems > catalogLimits.linkedItems,
  };
}

/**
 * Deletes a node and everything below it, with their uploaded images. The
 * Items linked to entries there take those entries' facts as their own
 * first, and the entry counts above follow. The deletion must not be too
 * large (`planDeletion`).
 */
export async function deleteSubtree(
  ctx: MutationCtx,
  node: Doc<"catalogNodes">,
  { below }: Deletion,
) {
  const removed = [node, ...below];
  for (const each of removed) {
    if (each.kind === "entry") await detachLinkedItems(ctx, each);
    if (each.imageFiles) {
      await ctx.storage.delete(each.imageFiles.full);
      await ctx.storage.delete(each.imageFiles.thumbnail);
    }
    await ctx.db.delete("catalogNodes", each._id);
  }
  const entries = removed.filter((each) => each.kind === "entry").length;
  if (entries === 0) return;
  for (const key of ancestorKeysOf(node.path)) {
    const ancestor = await nodeByKey(ctx, key);
    if (!ancestor || ancestor.kind === "entry") continue;
    await ctx.db.patch("catalogNodes", ancestor._id, {
      entryCount: Math.max(0, (ancestor.entryCount ?? 0) - entries),
    });
  }
}
