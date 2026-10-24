"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { labelSource } from "./collection/labelValidators";
import { labelOptions } from "./collection/labelSheet";
import { labelSheetPdf } from "./collection/labelSheetPdf";
import { knownTimeZone } from "./pdf/dates";
import { language } from "./utils/validators";

/**
 * Makes labels to print for the Items of the Collection view the signed-in
 * Premium member is looking at, or for chosen Items, as a PDF of label sheets
 * in `locale` (the app's, else their saved one) with dates in their
 * `timeZone`. Everyone else is turned away, as the Items are read as them:
 * PREMIUM_REQUIRED on the Free plan.
 */
export const download = action({
  args: {
    source: labelSource,
    options: labelOptions,
    locale: v.optional(language),
    /** The person's IANA time zone, e.g. "Europe/Oslo"; UTC when unknown. */
    timeZone: v.optional(v.string()),
  },
  returns: v.object({ fileName: v.string(), pdf: v.bytes() }),
  handler: async (ctx, { source, options, locale, timeZone }) => {
    const contents = await ctx.runQuery(
      internal.collection.exports.labelSheet,
      { source, locale },
    );
    const { fileName, pdf } = await labelSheetPdf(contents, options, {
      timeZone: knownTimeZone(timeZone),
      generatedAt: Date.now(),
    });
    return {
      fileName,
      pdf: pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength,
      ) as ArrayBuffer,
    };
  },
});
