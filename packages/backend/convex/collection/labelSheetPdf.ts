"use node";

import { formattersFor } from "@coinslite/i18n";
import { ConvexError } from "convex/values";
import { calendarDate } from "../pdf/dates";
import { renderLabelSheet } from "../pdf/labelSheet";
import { type ExportLabels, exportLabels } from "./exportLabels";
import type { LabelSheetContents } from "./labelValidators";
import {
  type LabelOptions,
  type LabelWords,
  clampSkip,
  labelCount,
  labelLayouts,
  labelSheetErrors,
  labelSheetLimits,
  labelSheetMessages,
  labelsOf,
} from "./labelSheet";
import { countryName } from "./viewRules";

/**
 * Makes the label sheets (spec 7) as a PDF in the contents' language, with
 * dates in `timeZone`: one label per Item, or per piece, on the sheets the
 * options choose, starting after the labels already used on the first sheet.
 * More labels than one PDF holds is turned away.
 */
export async function labelSheetPdf(
  contents: LabelSheetContents,
  options: LabelOptions,
  { timeZone, generatedAt }: { timeZone: string; generatedAt: number },
) {
  if (labelCount(contents.items, options.perPiece) > labelSheetLimits.labels)
    throw new ConvexError(labelSheetErrors.tooManyLabels);
  const { locale, currency } = contents;
  const messages = labelSheetMessages[locale];
  const labels = exportLabels[locale];
  const format = formattersFor(locale, { timeZone });
  const words: LabelWords = {
    locale,
    country: (code) => countryName(code, locale),
    money: (amount) => format.money(amount, currency),
    date: (date) => format.date(date),
    stampGrade: (grade) =>
      labels.stampGrades[grade as keyof ExportLabels["stampGrades"]] ?? grade,
    paid: messages.paid,
    value: messages.value,
  };
  const layout = labelLayouts[options.paper][options.size];
  const pdf = await renderLabelSheet({
    language: locale,
    title: messages.title,
    layout,
    size: options.size,
    labels: labelsOf(contents.items, options, words, contents.appUrl),
    skip: clampSkip(layout, options.skip),
  });
  return {
    fileName: `${messages.fileName}-${calendarDate(generatedAt, timeZone)}.pdf`,
    pdf,
  };
}
