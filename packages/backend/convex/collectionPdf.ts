"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { collectionView } from "./collection/browse";
import { collectionPdf } from "./collection/pdf";
import { knownTimeZone } from "./pdf/dates";
import { language } from "./utils/validators";

/**
 * Makes the Collection view the signed-in Premium member is looking at (its
 * search, filters and sort) into a PDF, in `locale` (the app's, else their
 * saved one) with times in their `timeZone`. Everyone else is turned away, as
 * the view is read as them: PREMIUM_REQUIRED on the Free plan.
 */
export const download = action({
  args: {
    view: collectionView,
    locale: v.optional(language),
    /** The person's IANA time zone, e.g. "Europe/Oslo"; UTC when unknown. */
    timeZone: v.optional(v.string()),
  },
  returns: v.object({ fileName: v.string(), pdf: v.bytes() }),
  handler: async (ctx, { view, locale, timeZone }) => {
    const contents = await ctx.runQuery(internal.collection.exports.pdf, {
      view,
      locale,
    });
    const { fileName, pdf } = await collectionPdf(contents, {
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
