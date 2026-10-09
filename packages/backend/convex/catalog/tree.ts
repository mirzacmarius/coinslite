import type { PaginationOptions } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
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

type Plan = {
  report: ImportReport;
  /** Rows in file order. */
  planned: Planned[];
  /** Where each node referred to ends up. */
  pathOf: (key: string) => string;
  /** Catalog nodes the file refers to, by key. */
  stored: Map<string, Doc<"catalogNodes">>;
};

const segments = (path: string) => path.split("/");
const parentKeyOf = (path: string) => segments(path).at(-2) ?? null;

async function nodeByKey(ctx: QueryCtx, key: string) {
  return await ctx.db
    .query("catalogNodes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

/** Reads a Catalog CSV file and works out what importing it would change. */
async function planImport(ctx: QueryCtx, csv: string): Promise<Plan> {
  const file = readCatalogFile(csv);
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

    for (const problem of checkNode(node.values, node.kind)) {
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
  };
}

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
  return (await planImport(ctx, csv)).report;
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
  const { report, planned, pathOf, stored } = await planImport(ctx, csv);
  if (report.errorCount > 0) return { ...report, applied: false };

  const ids = new Map<string, Id<"catalogNodes">>(
    [...stored].map(([key, node]) => [key, node._id]),
  );
  const depth = (node: Planned) => segments(pathOf(node.key)).length;
  /** The old paths of nodes that moved. */
  const moved: string[] = [];
  for (const node of [...planned].sort((a, b) => depth(a) - depth(b))) {
    const path = pathOf(node.key);
    const document = {
      key: node.key,
      kind: node.kind,
      path,
      ...(node.parentKey !== null && { parentId: ids.get(node.parentKey) }),
      ...fieldsFromValues(node.values),
      searchText: searchTextOf(node.values),
    };
    if (!node.existing) {
      ids.set(node.key, await ctx.db.insert("catalogNodes", document));
      continue;
    }
    if (node.existing.path !== path) moved.push(node.existing.path);
    await ctx.db.replace("catalogNodes", node.existing._id, document);
  }

  // Nodes the file doesn't mention move along with their moved ancestors.
  const inFile = new Set(planned.map((node) => node.key));
  const below: Doc<"catalogNodes">[] = [];
  for (const oldPath of moved) {
    for await (const node of ctx.db
      .query("catalogNodes")
      .withIndex("by_path", (q) =>
        q.gt("path", `${oldPath}/`).lt("path", `${oldPath}0`),
      )) {
      if (!inFile.has(node.key)) below.push(node);
    }
  }
  for (const node of below) stored.set(node.key, node);
  for (const node of below) {
    const path = pathOf(node.key);
    if (path !== node.path)
      await ctx.db.patch("catalogNodes", node._id, { path });
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
