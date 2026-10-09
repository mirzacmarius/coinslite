import { type HomeCurrency, type Locale, defaultLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { formatCsvFile } from "../catalog/csvText";
import { gradeCode, type gradingScales } from "../items/grades";
import { requirePremium } from "../plans";
import { language } from "../utils/validators";
import { collectionView, countryName, findItems } from "./browse";
import { type CsvColumn, csvColumns, exportLabels } from "./exportLabels";

/**
 * The Collection exports (Premium): a file of exactly the Items a Collection
 * view shows, in its order, made on the server in the person's language.
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
        ? gradeCode(scale, item.grade, item.strike) ??
          labels.stampGrades[item.grade as StampGrade]
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
    const written = locale ?? owner.language ?? defaultLocale;
    const { items } = await findItems(ctx, owner, view, written);
    const labels = exportLabels[written];
    return formatCsvFile([
      csvColumns.map((column) => labels.columns[column]),
      ...items.map((item) => csvRecord(item, owner.homeCurrency, written)),
    ]);
  },
});
