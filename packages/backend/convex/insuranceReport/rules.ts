import { ConvexError } from "convex/values";

/**
 * The Insurance report's values (spec 10). Pure, so the report screen shares
 * the column rules with the backend, and the preview and the PDF compute every
 * per-Item value and total the same way. Amounts are whole minor units of the
 * owner's Home currency.
 */

/** The value columns a report can show, in the order it shows them. */
export const reportColumns = [
  "purchasePrice",
  "marketValue",
  "metalValue",
  "insuredValue",
] as const;
export type ReportColumn = (typeof reportColumns)[number];

/** The values an Insured value is the highest of. At least one stays chosen. */
export const baseColumns = [
  "purchasePrice",
  "marketValue",
  "metalValue",
] as const satisfies readonly ReportColumn[];

/** What a new report shows: everything but the Purchase price. */
export const defaultColumns: readonly ReportColumn[] = [
  "marketValue",
  "metalValue",
  "insuredValue",
];

export const insuranceReportErrors = {
  /** None of Purchase price, Market value or Metal value was chosen. */
  baseValueRequired: "BASE_VALUE_REQUIRED",
  /** A scope of Albums with no Album and not the Items without one. */
  scopeRequired: "SCOPE_REQUIRED",
  /** More Items in scope than one report can hold. */
  tooManyItems: "REPORT_TOO_LARGE",
} as const;

export const insuranceReportLimits = {
  /**
   * Items in one report: read in one go, both for the live preview and for the
   * PDF, so the two always agree. A bigger Collection reports an Album at a time.
   */
  items: 5_000,
} as const;

/**
 * The chosen columns in report order, each once. Turns the choice away when
 * it leaves out all of Purchase price, Market value and Metal value.
 */
export function checkColumns(columns: readonly ReportColumn[]): ReportColumn[] {
  const chosen = reportColumns.filter((column) => columns.includes(column));
  if (!baseColumns.some((column) => chosen.includes(column))) {
    throw new ConvexError(insuranceReportErrors.baseValueRequired);
  }
  return chosen;
}

/** An Item's amount in each chosen column; a value the Item lacks is absent. */
export type ReportValues = Partial<Record<ReportColumn, number>>;

/** What a report needs to know about an Item to value it. */
export type ValuedItem = {
  quantity: number;
  /** Per piece. */
  purchasePrice?: number;
  /** Per piece. */
  marketValue?: number;
};

/**
 * One Item's values for the chosen columns:
 * - Purchase price × Quantity
 * - Market value × Quantity
 * - its Metal value (`metalValue`, already for every piece; undefined for an
 *   Item without one)
 * - Insured value: the highest of the chosen base values the Item has.
 */
export function itemValues(
  item: ValuedItem,
  metalValue: number | undefined,
  columns: readonly ReportColumn[],
): ReportValues {
  const base: ReportValues = {
    purchasePrice:
      item.purchasePrice === undefined
        ? undefined
        : item.purchasePrice * item.quantity,
    marketValue:
      item.marketValue === undefined
        ? undefined
        : item.marketValue * item.quantity,
    metalValue,
  };
  const values: ReportValues = {};
  for (const column of baseColumns) {
    const value = base[column];
    if (columns.includes(column) && value !== undefined) values[column] = value;
  }
  const chosenBase = baseColumns.flatMap((column) => values[column] ?? []);
  if (columns.includes("insuredValue") && chosenBase.length > 0) {
    values.insuredValue = Math.max(...chosenBase);
  }
  return values;
}

/** A report's counts, and its total in each chosen column (0 when no Item has a value). */
export type ReportTotals = {
  /** How many Items. */
  items: number;
  /** How many pieces: the Items' Quantities added up. */
  pieces: number;
  values: ReportValues;
};

/** Adds up the report's Items, Item by Item, so the totals match the rows. */
export function reportTotals(
  rows: readonly { quantity: number; values: ReportValues }[],
  columns: readonly ReportColumn[],
): ReportTotals {
  const values: ReportValues = {};
  for (const column of reportColumns) {
    if (columns.includes(column)) values[column] = 0;
  }
  let pieces = 0;
  for (const row of rows) {
    pieces += row.quantity;
    for (const column of reportColumns) {
      const value = row.values[column];
      if (value !== undefined && values[column] !== undefined) {
        values[column] += value;
      }
    }
  }
  return { items: rows.length, pieces, values };
}
