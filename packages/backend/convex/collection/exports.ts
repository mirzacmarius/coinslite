import { type HomeCurrency, type Locale, defaultLocale } from "@coinslite/i18n";
import { ConvexError, type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type QueryCtx, env, internalQuery, query } from "../_generated/server";
import { formatCsvFile } from "../catalog/csvText";
import { refuseWhileChanging } from "../homeCurrency/rules";
import { gradeCode, type gradingScales } from "../items/grades";
import {
  graderNames,
  referenceName,
  stampCatalogueNames,
} from "../items/references";
import { collectionTotals, itemGainLoss, totalPieces } from "../items/totals";
import { resolveItems } from "../items/resolve";
import { requirePremium } from "../plans";
import {
  gradingScale,
  homeCurrency,
  itemType,
  language,
  strike,
} from "../utils/validators";
import { collectionView, findItems } from "./browse";
import { type CsvColumn, csvColumns, exportLabels } from "./exportLabels";
import { collectionExportErrors, collectionPdfLimits } from "./exportRules";
import {
  type LabelItem,
  labelSheetErrors,
  labelSheetLimits,
} from "./labelSheet";
import { labelSheetContents, labelSource } from "./labelValidators";
import { withoutAlbum } from "./view";
import { countryName } from "./viewRules";

/**
 * The Collection exports (Premium): a file of exactly the Items a Collection
 * view shows, in its order, made on the server in the person's language. A
 * Collection too large to read in one go isn't exported at all, rather than
 * exported with Items missing.
 */

/** Every Home currency divides into 100 minor units (packages/i18n). */
const minorUnits = 100;

/**
 * An amount in minor units as a plain number a spreadsheet reads in any
 * language: "1250.50", without a currency sign or thousands separators.
 */
function plainAmount(minor: number | undefined) {
  if (minor === undefined) return "";
  const cents = String(minor % minorUnits).padStart(2, "0");
  return `${Math.floor(minor / minorUnits)}.${cents}`;
}

type StampGrade = (typeof gradingScales.stamp.grades)[number];

/** One Item as a CSV record, its cells in `csvColumns` order. */
function csvRecord(item: Doc<"items">, currency: HomeCurrency, locale: Locale) {
  const labels = exportLabels[locale];
  const scale = item.gradingScale;
  const cells: Record<CsvColumn, string | undefined> = {
    type: labels.types[item.type],
    title: item.title,
    year: item.year?.toString(),
    denomination: item.denomination,
    grade:
      scale && item.grade !== undefined
        ? (gradeCode(scale, item.grade, item.strike, locale) ??
          labels.stampGrades[item.grade as StampGrade])
        : undefined,
    gradingScale: scale && labels.scales[scale],
    strike: item.strike && labels.strikes[item.strike],
    // As the Item's page shows it: the material, then the note about it.
    material:
      [item.material && labels.materials[item.material], item.materialNote]
        .filter(Boolean)
        .join(" · ") || undefined,
    country: item.country && countryName(item.country, locale),
    quantity: item.quantity.toString(),
    purchasePrice: plainAmount(item.purchasePrice),
    marketValue: plainAmount(item.marketValue),
    currency,
    purchaseDate: item.purchaseDate,
    source: item.source,
    storage: item.storage,
    tags: item.tags?.join(", "),
    soldOn: item.soldOn,
    salePrice: plainAmount(item.salePrice),
    saleNote: item.saleNote,
    grader:
      item.grader &&
      referenceName(graderNames, item.grader, item.graderName, labels.other),
    certificateNumber: item.certificateNumber,
    stampCatalogue:
      item.stampCatalogue &&
      referenceName(
        stampCatalogueNames,
        item.stampCatalogue,
        item.stampCatalogueName,
        labels.other,
      ),
    stampCatalogueNumber: item.stampCatalogueNumber,
    perforation: item.perforation,
    watermark: item.watermark,
    colour: item.colour,
    serialNumber: item.serialNumber,
    signatures: item.signatures,
    printer: item.printer,
  };
  return csvColumns.map((column) => cells[column] ?? "");
}

/**
 * The Collection view as a CSV file for spreadsheets: UTF-8 with a byte order
 * mark, RFC 4180 quoting, a header row, then one row per Item in the view's
 * order. Headings and names (Item type, Grade, material, country…) are in
 * the person's language; numbers and dates are plain (1250.50, 2024-03-05).
 */
export const csv = query({
  args: {
    view: collectionView,
    /** The file's language, and the one country names are searched in; the person's own by default. */
    locale: v.optional(language),
  },
  returns: v.string(),
  handler: async (ctx, { view, locale }) => {
    const owner = await requirePremium(ctx);
    // Mid-change, its amounts would be in two currencies.
    refuseWhileChanging(owner);
    const written = locale ?? owner.language ?? defaultLocale;
    const { items, complete } = await findItems(ctx, owner, view, written);
    if (!complete) throw new ConvexError(collectionExportErrors.incomplete);
    const labels = exportLabels[written];
    return formatCsvFile([
      csvColumns.map((column) => labels.columns[column]),
      ...items.map((item) => csvRecord(item, owner.homeCurrency, written)),
    ]);
  },
});

/** Everything the Collection PDF shows, read in one transaction. */
export const pdfContents = v.object({
  /** The language the PDF is written in. */
  locale: language,
  owner: v.object({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  /** The Home currency every amount is in. */
  currency: homeCurrency,
  /** The view the PDF covers, as asked for. */
  view: collectionView,
  /** The name of the Album the view is narrowed to, when it's the person's. */
  albumName: v.optional(v.string()),
  /** The country the origin filter compares against; null when there's none. */
  ownCountry: v.union(v.string(), v.null()),
  /** One per Item, in the view's order. Amounts are for all of an Item's pieces. */
  rows: v.array(
    v.object({
      type: itemType,
      title: v.string(),
      year: v.optional(v.number()),
      denomination: v.optional(v.string()),
      gradingScale: v.optional(gradingScale),
      grade: v.optional(v.string()),
      strike: v.optional(strike),
      quantity: v.number(),
      purchaseDate: v.optional(v.string()),
      /** Purchase price × Quantity. */
      purchasePrice: v.optional(v.number()),
      /** Market value × Quantity. */
      marketValue: v.optional(v.number()),
      /** The difference, when the Item has both. */
      gainLoss: v.optional(v.number()),
    }),
  ),
  totals: v.object({
    items: v.number(),
    pieces: v.number(),
    purchasePrice: v.number(),
    marketValue: v.number(),
    /** Over the Items that have both a Purchase price and a Market value. */
    gainLoss: v.object({ amount: v.number(), items: v.number() }),
  }),
});
export type PdfContents = Infer<typeof pdfContents>;

/**
 * What the Collection PDF shows, for the signed-in Premium member (the action
 * that makes the PDF runs this as them): exactly the Items the view shows, in
 * its order, each with its amounts × Quantity and Gain/loss, and the totals.
 * A view with more Items than a PDF lists, or of a Collection too large to
 * read whole, is turned away rather than cut short.
 */
export const pdf = internalQuery({
  args: {
    view: collectionView,
    /** The PDF's language, and the one country names are searched in; the person's own by default. */
    locale: v.optional(language),
  },
  returns: pdfContents,
  handler: async (ctx, { view, locale }) => {
    const owner = await requirePremium(ctx);
    // Mid-change, its amounts would be in two currencies.
    refuseWhileChanging(owner);
    const written = locale ?? owner.language ?? defaultLocale;
    const { items, ownCountry, complete } = await findItems(
      ctx,
      owner,
      view,
      written,
    );
    if (!complete) throw new ConvexError(collectionExportErrors.incomplete);
    if (items.length > collectionPdfLimits.items)
      throw new ConvexError(collectionExportErrors.tooManyItems);
    const currency = owner.homeCurrency;
    const totals = collectionTotals(items, { currency, spotPrices: null });
    const albumId =
      view.album === undefined || view.album === withoutAlbum
        ? null
        : ctx.db.normalizeId("albums", view.album);
    const album = albumId && (await ctx.db.get(albumId));
    const times = (amount: number | undefined, quantity: number) =>
      amount === undefined ? undefined : amount * quantity;
    return {
      locale: written,
      owner: {
        name: owner.fullName ?? owner.displayName,
        email: owner.email,
      },
      currency,
      view,
      albumName: album && album.ownerId === owner._id ? album.name : undefined,
      ownCountry,
      rows: items.map((item) => ({
        type: item.type,
        title: item.title,
        year: item.year,
        denomination: item.denomination,
        gradingScale: item.gradingScale,
        grade: item.grade,
        strike: item.strike,
        quantity: item.quantity,
        purchaseDate: item.purchaseDate,
        purchasePrice: times(item.purchasePrice, item.quantity),
        marketValue: times(item.marketValue, item.quantity),
        gainLoss: itemGainLoss(item),
      })),
      totals: {
        items: totals.items,
        pieces: totalPieces(totals),
        purchasePrice: totals.purchasePrice,
        marketValue: totals.marketValue,
        gainLoss: totals.gainLoss,
      },
    };
  },
});

/** A resolved Item as its label describes it. */
function labelItemOf(item: Doc<"items">): LabelItem {
  return {
    id: item._id,
    type: item.type,
    title: item.title,
    country: item.country,
    year: item.year,
    denomination: item.denomination,
    mintMark: item.mintMark,
    gradingScale: item.gradingScale,
    grade: item.grade,
    strike: item.strike,
    numistaNumber: item.numistaNumber,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    purchaseDate: item.purchaseDate,
    marketValue: item.marketValue,
  };
}

/** The chosen Items that are the person's, in the order asked, with their facts resolved. */
async function ownItems(
  ctx: QueryCtx,
  owner: Doc<"users">,
  itemIds: Id<"items">[],
) {
  if (itemIds.length > labelSheetLimits.items)
    throw new ConvexError(labelSheetErrors.tooManyLabels);
  const found = await Promise.all(
    itemIds.map((itemId) => ctx.db.get("items", itemId)),
  );
  const own = found.filter(
    (item): item is Doc<"items"> => item !== null && item.ownerId === owner._id,
  );
  return await resolveItems(ctx, own);
}

/**
 * What the label sheets say, for the signed-in Premium member (the action
 * that makes the PDF runs this as them): the Items of the view in its order,
 * or the chosen Items, each with the facts a label can show. More Items than
 * one PDF holds labels for, or a Collection too large to read whole, is
 * turned away rather than cut short.
 */
export const labelSheet = internalQuery({
  args: {
    source: labelSource,
    /** The labels' language, and the one country names are searched in; the person's own by default. */
    locale: v.optional(language),
  },
  returns: labelSheetContents,
  handler: async (ctx, { source, locale }) => {
    const owner = await requirePremium(ctx);
    // Mid-change, the amounts would be in two currencies.
    refuseWhileChanging(owner);
    const written = locale ?? owner.language ?? defaultLocale;
    let items: Doc<"items">[];
    if (source.kind === "view") {
      const found = await findItems(ctx, owner, source.view, written);
      if (!found.complete)
        throw new ConvexError(collectionExportErrors.incomplete);
      items = found.items;
    } else {
      items = await ownItems(ctx, owner, source.itemIds);
    }
    if (items.length > labelSheetLimits.labels)
      throw new ConvexError(labelSheetErrors.tooManyLabels);
    return {
      locale: written,
      currency: owner.homeCurrency,
      appUrl: env.SITE_URL ?? null,
      items: items.map(labelItemOf),
    };
  },
});
