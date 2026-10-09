"use node";

import { defaultLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { insuranceReportPdf } from "./insuranceReport/pdf";
import { reportArgs } from "./insuranceReport/validators";
import { knownTimeZone } from "./pdf/dates";
import { language } from "./utils/validators";

/**
 * Makes the signed-in Premium member's Insurance report as a PDF, in
 * `language` (the app's, else their saved one) with times in their
 * `timeZone`. Everyone else is turned away, as the report's contents are
 * read as them: PREMIUM_REQUIRED on the Free plan.
 */
export const download = action({
  args: {
    ...reportArgs,
    language: v.optional(language),
    /** The person's IANA time zone, e.g. "Europe/Oslo"; UTC when unknown. */
    timeZone: v.optional(v.string()),
  },
  returns: v.object({ fileName: v.string(), pdf: v.bytes() }),
  handler: async (ctx, { scope, columns, language, timeZone }) => {
    const contents = await ctx.runQuery(internal.insuranceReport.contents, {
      scope,
      columns,
    });
    const { fileName, pdf } = await insuranceReportPdf(contents, {
      locale: language ?? contents.owner.language ?? defaultLocale,
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
