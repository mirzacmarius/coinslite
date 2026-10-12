import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { euroCirculationCoins } from "./datasets/euroCirculationCoins";
import { euroCommemoratives } from "./datasets/euroCommemoratives";
import { norway } from "./datasets/norway";
import { usCoinProgrammes } from "./datasets/usCoinProgrammes";
import { usSilverDollars } from "./datasets/usSilverDollars";
import { importCatalogFile } from "./tree";

/**
 * The Catalog datasets that ship with CoinsLite, as Catalog CSV files, in the
 * order they load. Each is CoinsLite's own data from a source it may store
 * (ADR 0003); nothing is fetched while loading.
 */
const datasets = {
  usSilverDollars,
  usCoinProgrammes,
  euroCommemoratives,
  norway,
  euroCirculationCoins,
};

const loadReport = v.object({
  dataset: v.string(),
  inserts: v.number(),
  updates: v.number(),
  unchanged: v.number(),
});

/** Loads one bundled dataset through the CSV import; a dataset with any problem changes nothing. */
export const loadDataset = internalMutation({
  args: {
    dataset: v.union(
      v.literal("usSilverDollars"),
      v.literal("usCoinProgrammes"),
      v.literal("euroCommemoratives"),
      v.literal("norway"),
      v.literal("euroCirculationCoins"),
    ),
  },
  returns: loadReport,
  handler: async (ctx, { dataset }) => {
    const { inserts, updates, unchanged, errors, applied } =
      await importCatalogFile(ctx, datasets[dataset]);
    if (!applied) {
      throw new ConvexError(
        `Dataset ${dataset} has problems: ${JSON.stringify(errors)}`,
      );
    }
    return { dataset, inserts, updates, unchanged };
  },
});

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
    for (const dataset of Object.keys(datasets) as Array<
      keyof typeof datasets
    >) {
      loaded.push(
        await ctx.runMutation(internal.catalog.seed.loadDataset, { dataset }),
      );
    }
    await ctx.scheduler.runAfter(
      0,
      internal.catalog.tree.refreshBrowseFields,
      {},
    );
    return loaded;
  },
});
