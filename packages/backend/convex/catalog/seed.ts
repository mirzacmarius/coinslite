import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { usSilverDollars } from "./datasets/usSilverDollars";
import { importCatalogFile, refreshBrowseFields } from "./tree";

/**
 * The Catalog datasets that ship with CoinsLite, as Catalog CSV files, in the
 * order they load. Each is CoinsLite's own data from a source it may store
 * (ADR 0003); nothing is fetched while loading.
 */
const datasets = { usSilverDollars };

/**
 * Loads every bundled dataset through the CSV import, so loading again only
 * updates what changed, then fills in browsing (entry counts, countries) for
 * any Catalog data stored before it existed. Run it on a deployment with
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
    await refreshBrowseFields(ctx);
    return loaded;
  },
});
