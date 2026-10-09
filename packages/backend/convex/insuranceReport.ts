import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, internalQuery, query } from "./_generated/server";
import { albumErrors } from "./albums/rules";
import {
  type ReportColumn,
  checkColumns,
  insuranceReportErrors,
  insuranceReportLimits,
  itemValues,
  reportTotals,
} from "./insuranceReport/rules";
import {
  type ReportScope,
  reportArgs,
  reportContents,
} from "./insuranceReport/validators";
import { metalValue } from "./items/preciousMetal";
import { requirePremium } from "./plans";
import { latestRates } from "./spotPrices";
import { type Metal, TROY_OUNCE_GRAMS } from "./spotPrices/rates";
import { homeCurrency, reportValues } from "./utils/validators";

/**
 * The Insurance report (spec 10), a Premium feature: the chosen Items with
 * their chosen values. The report screen's preview is here; the PDF is made
 * from `contents` by insuranceReportPdf.ts.
 */

type Owner = Awaited<ReturnType<typeof requirePremium>>;

/**
 * The Items a report covers, and the chosen Albums. Albums must be the
 * owner's; each is read once however often it's chosen. More Items than a
 * report holds turn the request away rather than leaving some out.
 */
async function itemsInScope(ctx: QueryCtx, owner: Owner, scope: ReportScope) {
  const limit = insuranceReportLimits.items;
  const items: Doc<"items">[] = [];
  /** Reads one index range, a little past what's left so too many shows. */
  const read = async (albumId?: Id<"albums">) => {
    const left = limit - items.length;
    const query =
      scope.kind === "collection"
        ? ctx.db
            .query("items")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
        : ctx.db
            .query("items")
            .withIndex("by_ownerId_and_albumId", (q) =>
              q.eq("ownerId", owner._id).eq("albumId", albumId),
            );
    items.push(...(await query.take(left + 1)));
    if (items.length > limit)
      throw new ConvexError(insuranceReportErrors.tooManyItems);
  };

  if (scope.kind === "collection") {
    await read();
    return { items, albums: [] };
  }
  const albumIds = [...new Set(scope.albumIds)];
  if (albumIds.length === 0 && !scope.withoutAlbum)
    throw new ConvexError(insuranceReportErrors.scopeRequired);
  const albums: Doc<"albums">[] = [];
  for (const albumId of albumIds) {
    const album = await ctx.db.get(albumId);
    if (!album || album.ownerId !== owner._id)
      throw new ConvexError(albumErrors.notFound);
    albums.push(album);
    await read(albumId);
  }
  if (scope.withoutAlbum) await read(undefined);
  return { items, albums };
}

/**
 * The signed-in Premium member's report: the Items in scope, each valued for
 * the chosen columns at the latest Spot prices, and the totals.
 */
async function valueReport(
  ctx: QueryCtx,
  scope: ReportScope,
  chosen: readonly ReportColumn[],
) {
  const owner = await requirePremium(ctx);
  const columns = checkColumns(chosen);
  const rates = await latestRates(ctx);
  const { items, albums } = await itemsInScope(ctx, owner, scope);
  const rows = items.map((item) => ({
    item,
    quantity: item.quantity,
    values: itemValues(
      item,
      rates ? metalValue(item, rates, owner.homeCurrency) : undefined,
      columns,
    ),
  }));
  return {
    owner,
    columns,
    rates,
    albums,
    rows,
    totals: reportTotals(rows, columns),
  };
}

/**
 * What the report would hold, for the report screen: how many Items and
 * pieces, the total of each chosen value, and when the Spot prices behind the
 * Metal values were quoted (null before the first ones arrive, when no Item
 * has a Metal value). A scope with more Items than a report holds comes back
 * as "tooLarge", for the screen to explain; the PDF refuses it. Premium only.
 */
export const preview = query({
  args: reportArgs,
  returns: v.union(
    v.object({
      status: v.literal("ready"),
      items: v.number(),
      pieces: v.number(),
      currency: homeCurrency,
      totals: reportValues,
      spotPrices: v.union(
        v.null(),
        v.object({ quotedAt: v.number(), stale: v.boolean() }),
      ),
    }),
    v.object({ status: v.literal("tooLarge"), limit: v.number() }),
  ),
  handler: async (ctx, { scope, columns }) => {
    try {
      const { owner, totals, rates } = await valueReport(ctx, scope, columns);
      return {
        status: "ready" as const,
        items: totals.items,
        pieces: totals.pieces,
        currency: owner.homeCurrency,
        totals: totals.values,
        spotPrices: rates && { quotedAt: rates.quotedAt, stale: rates.stale },
      };
    } catch (error) {
      if (
        error instanceof ConvexError &&
        error.data === insuranceReportErrors.tooManyItems
      ) {
        return {
          status: "tooLarge" as const,
          limit: insuranceReportLimits.items,
        };
      }
      throw error;
    }
  },
});

/**
 * Everything the PDF shows, for the signed-in Premium member (the action that
 * makes the PDF runs this as them): their contact details, the scope, the
 * Spot prices used, a row per Item and the totals.
 */
export const contents = internalQuery({
  args: reportArgs,
  returns: reportContents,
  handler: async (ctx, { scope, columns }) => {
    const report = await valueReport(ctx, scope, columns);
    const { owner, rates } = report;
    const currency = owner.homeCurrency;
    const priceOf = (metal: Metal) => {
      const perGram = rates?.spotPricePerGram(metal, currency) ?? 0;
      return {
        perGram: Math.round(perGram),
        perOunce: Math.round(perGram * TROY_OUNCE_GRAMS),
      };
    };
    return {
      owner: {
        name: owner.fullName ?? owner.displayName,
        email: owner.email,
        phone: owner.contactPhone,
        streetAddress: owner.streetAddress,
        postalCode: owner.postalCode,
        city: owner.city,
        country: owner.country,
        language: owner.language,
      },
      currency,
      scope:
        scope.kind === "collection"
          ? scope
          : {
              kind: "albums" as const,
              albums: report.albums.map((album) => album.name),
              withoutAlbum: scope.withoutAlbum,
            },
      columns: report.columns,
      spotPrices: rates && {
        quotedAt: rates.quotedAt,
        stale: rates.stale,
        gold: priceOf("gold"),
        silver: priceOf("silver"),
      },
      rows: report.rows.map(({ item, quantity, values }) => ({
        type: item.type,
        title: item.title,
        year: item.year,
        denomination: item.denomination,
        gradingScale: item.gradingScale,
        grade: item.grade,
        strike: item.strike,
        quantity,
        values,
      })),
      totals: report.totals,
    };
  },
});
