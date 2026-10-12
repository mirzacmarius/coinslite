import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { importCatalogFile } from "./tree";

/**
 * The Catalog datasets that ship with CoinsLite, as Catalog CSV files, in the
 * order they load. Each is CoinsLite's own data from a source it may store
 * (ADR 0003); nothing is fetched while loading.
 *
 * Each dataset loads through a module of its own in catalog/seeds/ that
 * imports only its file, so a run holds one dataset's text in memory, not
 * all of them. This module imports none.
 */
const datasets = [
  internal.catalog.seeds.usSilverDollars.load,
  // Below the United States root the silver dollars add.
  internal.catalog.seeds.usCoinProgrammes.load,
  internal.catalog.seeds.euroCommemoratives.load,
  internal.catalog.seeds.norway.load,
  internal.catalog.seeds.euroCirculationCoins.load,
  internal.catalog.seeds.romania.load,
  internal.catalog.seeds.euroBanknotes.load,
  // Below the Finland root the euro circulation coins add.
  internal.catalog.seeds.finland.load,
];

const loadReport = v.object({
  dataset: v.string(),
  inserts: v.number(),
  updates: v.number(),
  unchanged: v.number(),
});

/**
 * The internal mutation that loads one bundled dataset through the CSV
 * import; a dataset with any problem changes nothing. Each module in
 * catalog/seeds/ exports one.
 */
export function datasetLoader(dataset: string, csv: string) {
  return internalMutation({
    args: {},
    returns: loadReport,
    handler: async (ctx) => {
      const { inserts, updates, unchanged, errors, applied } =
        await importCatalogFile(ctx, csv);
      if (!applied) {
        throw new ConvexError(
          `Dataset ${dataset} has problems: ${JSON.stringify(errors)}`,
        );
      }
      return { dataset, inserts, updates, unchanged };
    },
  });
}

/**
 * Loads every bundled dataset through the CSV import, each in a transaction
 * of its own, so loading again only updates what changed, then fills in
 * browsing (entry counts, countries) for any Catalog data stored before it
 * existed, in the background a batch at a time. Run it on a deployment with
 * `npx convex run catalog/seed:load`.
 */
export const load = internalAction({
  args: {},
  returns: v.array(loadReport),
  handler: async (ctx) => {
    const loaded: Array<Infer<typeof loadReport>> = [];
    for (const dataset of datasets) {
      loaded.push(await ctx.runMutation(dataset, {}));
    }
    await ctx.scheduler.runAfter(
      0,
      internal.catalog.tree.refreshBrowseFields,
      {},
    );
    return loaded;
  },
});
