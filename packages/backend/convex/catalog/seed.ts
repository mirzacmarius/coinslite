import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { euroCommemoratives } from "./datasets/euroCommemoratives";
import { norway } from "./datasets/norway";
import { usSilverDollars } from "./datasets/usSilverDollars";
import { importCatalogFile } from "./tree";

/**
 * The Catalog datasets that ship with CoinsLite, as Catalog CSV files, in the
 * order they load. Each is CoinsLite's own data from a source it may store
 * (ADR 0003); nothing is fetched while loading.
 */
const datasets = { usSilverDollars, euroCommemoratives, norway };

/**
 * Loads every bundled dataset through the CSV import, so loading again only
 * updates what changed, then fills in browsing (entry counts, countries) for
 * any Catalog data stored before it existed, in the background a batch at a
 * time. Run it on a deployment with
 * `npx convex run catalog/seed:load`.
 */
export const load = internalMutation({
  args: {},
  returns: v.array(
    v.object({
      dataset: v.string(),
      inserts: v.number(),
      updates: v.number(),
      unchanged: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const loaded = [];
    for (const [dataset, csv] of Object.entries(datasets)) {
      const { inserts, updates, unchanged, errors, applied } =
        await importCatalogFile(ctx, csv);
      if (!applied) {
        throw new ConvexError(
          `Dataset ${dataset} has problems: ${JSON.stringify(errors)}`,
        );
      }
      loaded.push({ dataset, inserts, updates, unchanged });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.catalog.tree.refreshBrowseFields,
      {},
    );
    return loaded;
  },
});
