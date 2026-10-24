import { defaultLocale } from "@coinslite/i18n";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { canUseScanner, catalogVisibleTo } from "./featureFlags";
import { photoErrors } from "./photos/rules";
import {
  type ScanCandidate,
  rankCandidates,
  scannerErrors,
} from "./scanner/rules";
import { scannerConfigured } from "./scanner/vision";
import { requireSetUpUser } from "./utils/auth";
import { ownUpload } from "./utils/files";
import { catalogItemType, language, material } from "./utils/validators";

/**
 * The scanner's database side (scan.ts runs the scan itself): who may
 * scan, how often, and the Catalog entries a coin or banknote might be.
 */

const rateLimiter = new RateLimiter(components.rateLimiter, {
  /** Each scan asks a paid vision model: a few dozen an hour at most. */
  scan: { kind: "token bucket", rate: 10, period: HOUR, capacity: 20 },
});

/**
 * Whether the signed-in person sees the scanner (the scanner flag, and
 * Premium during the beta), and whether this deployment can scan at all.
 */
export const status = query({
  args: {},
  returns: v.object({ available: v.boolean(), configured: v.boolean() }),
  handler: async (ctx) => ({
    available: await canUseScanner(ctx),
    configured: scannerConfigured(),
  }),
});

/**
 * Starts a scan of two photos the caller just uploaded and registered:
 * checks they may scan and that both uploads are theirs, then counts the
 * scan against their pace. `configured` is false on a deployment without
 * the vision model's key, and nothing is counted.
 */
export const begin = internalMutation({
  args: { front: v.id("_storage"), back: v.id("_storage") },
  returns: v.object({
    configured: v.boolean(),
    language,
    catalogVisible: v.boolean(),
  }),
  handler: async (ctx, { front, back }) => {
    const user = await requireSetUpUser(ctx);
    if (!(await canUseScanner(ctx)))
      throw new ConvexError(scannerErrors.notAvailable);
    // One photo can't be both sides.
    if (front === back) throw new ConvexError(photoErrors.notFound);
    const now = Date.now();
    for (const storageId of [front, back]) {
      if (!(await ownUpload(ctx, storageId, user._id, "photo", now)))
        throw new ConvexError(photoErrors.notFound);
    }
    const started = {
      language: user.language ?? defaultLocale,
      catalogVisible: await catalogVisibleTo(ctx, user),
    };
    if (!scannerConfigured()) return { configured: false, ...started };
    const { ok } = await rateLimiter.limit(ctx, "scan", { key: user._id });
    if (!ok) throw new ConvexError(scannerErrors.tooMany);
    return { configured: true, ...started };
  },
});

/** Catalog nodes read from the search index per scan, at most. */
const scanned = 128;

const candidate = v.object({
  key: v.string(),
  title: v.string(),
  country: v.optional(v.string()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  yearFrom: v.optional(v.number()),
  yearTo: v.optional(v.number()),
  material: v.optional(material),
  diameter: v.optional(v.number()),
});

const textOrNull = v.union(v.string(), v.null());
const numberOrNull = v.union(v.number(), v.null());

/**
 * The Catalog entries of the reading's Item type it might be, likeliest
 * first (scanner/rules.ts ranks them): those found by the reading's words.
 */
export const candidates = internalQuery({
  args: {
    words: v.array(v.string()),
    // A ScanReading (scanner/rules.ts).
    reading: v.object({
      itemType: v.union(catalogItemType, v.null()),
      title: textOrNull,
      country: textOrNull,
      year: numberOrNull,
      denomination: textOrNull,
      series: textOrNull,
      ruler: textOrNull,
      material: textOrNull,
      mintMark: textOrNull,
      diameter: numberOrNull,
      serialNumber: textOrNull,
      signatures: textOrNull,
      printer: textOrNull,
      inscriptions: textOrNull,
      grade: v.union(
        v.object({ scale: v.string(), value: v.string() }),
        v.null(),
      ),
    }),
  },
  returns: v.array(candidate),
  handler: async (ctx, { words, reading }) => {
    const { itemType } = reading;
    if (words.length === 0 || itemType === null) return [];
    const nodes = await ctx.db
      .query("catalogNodes")
      .withSearchIndex("search_searchText", (q) =>
        q
          .search("searchText", words.join(" "))
          .eq("itemType", itemType)
          .eq("kind", "entry"),
      )
      .take(scanned);
    const entries: ScanCandidate[] = nodes.map((node) => ({
      key: node.key,
      title: node.title,
      country: node.country,
      denomination: node.denomination,
      series: node.series,
      yearFrom: node.yearFrom,
      yearTo: node.yearTo,
      material: node.material,
      diameter: node.diameter,
    }));
    return rankCandidates(reading, entries);
  },
});
