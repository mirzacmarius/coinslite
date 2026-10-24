import {
  type LabelLayout,
  type LabelOptions,
  type Paper,
  defaultLabelOptions,
  labelSizes,
  labelsPerSheet,
  papers,
} from "@coinslite/backend/convex/collection/labelSheet";

/**
 * The Labels dialog's choices as kept on the device (spec 7), and what the
 * dialog says about a sheet. Pure.
 */

/** The choices kept: all but the used labels to skip, which belong to one sheet. */
export type StoredLabelOptions = Omit<LabelOptions, "skip">;

const oneOf = <T extends string>(
  values: readonly T[],
  value: unknown,
  fallback: T,
): T => (values.includes(value as T) ? (value as T) : fallback);

const flag = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

/** The stored choices, each the default when missing or unreadable. */
export function readLabelOptions(stored: string | null): StoredLabelOptions {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    if (value !== null && typeof value === "object")
      saved = value as Record<string, unknown>;
  } catch {
    // Not JSON: as if nothing were stored.
  }
  const defaults = defaultLabelOptions;
  return {
    size: oneOf(labelSizes, saved.size, defaults.size),
    paper: oneOf(papers, saved.paper, defaults.paper),
    purchase: flag(saved.purchase, defaults.purchase),
    marketValue: flag(saved.marketValue, defaults.marketValue),
    qrCode: flag(saved.qrCode, defaults.qrCode),
    perPiece: flag(saved.perPiece, defaults.perPiece),
  };
}

/** How many sheets the labels take, after the used ones on the first sheet. */
export const sheetsFor = (layout: LabelLayout, skip: number, labels: number) =>
  labels <= 0 ? 0 : Math.ceil((skip + labels) / labelsPerSheet(layout));

/** The papers' names, which every language writes the same. */
export const paperNames: Record<Paper, string> = {
  a4: "A4",
  letter: "US Letter",
};

/**
 * A label's size as its sheets are sold: in millimetres on A4, in inches on
 * Letter, with numbers as `number` writes them.
 */
export function labelMeasure(
  layout: LabelLayout,
  paper: Paper,
  number: (value: number, options?: Intl.NumberFormatOptions) => string,
) {
  const { width, height } = layout.label;
  if (paper === "letter") {
    const inches = (mm: number) =>
      `${number(mm / 25.4, { maximumFractionDigits: 3 })}″`;
    return `${inches(width)} × ${inches(height)}`;
  }
  const mm = (value: number) => number(value, { maximumFractionDigits: 2 });
  return `${mm(width)} × ${mm(height)} mm`;
}
