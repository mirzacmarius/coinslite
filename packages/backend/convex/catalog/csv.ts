import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../utils/auth";
import { exportCatalogPage, importCatalogFile, previewImport } from "./tree";

/**
 * The admin's bulk tools for the Catalog: export it to CSV, and import a CSV
 * file that updates the nodes it names by id and inserts the rest.
 */

const importReport = {
  inserts: v.number(),
  updates: v.number(),
  unchanged: v.number(),
  errorCount: v.number(),
  errors: v.array(
    v.object({
      row: v.number(),
      column: v.optional(v.string()),
      code: v.string(),
    }),
  ),
};

/** What importing a file would insert and update, and its problems by row, without changing anything. */
export const preview = query({
  args: { csv: v.string() },
  returns: v.object(importReport),
  handler: async (ctx, { csv }) => {
    await requireAdmin(ctx);
    return await previewImport(ctx, csv);
  },
});

/** Imports a Catalog CSV file. A file with any problem changes nothing (`applied` is false). */
export const importFile = mutation({
  args: { csv: v.string() },
  returns: v.object({ ...importReport, applied: v.boolean() }),
  handler: async (ctx, { csv }) => {
    await requireAdmin(ctx);
    return await importCatalogFile(ctx, csv);
  },
});

/** A page of the Catalog as CSV; joining every page gives the whole file. */
export const exportPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    csv: v.string(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    return await exportCatalogPage(ctx, paginationOpts);
  },
});
