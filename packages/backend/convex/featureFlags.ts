import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import {
  type FeatureFlags,
  type FlagKey,
  flagDefaults,
} from "./featureFlags/rules";
import { planOf } from "./plans";
import { requireAdmin } from "./utils/auth";
import { featureFlag, scannerAvailability } from "./utils/validators";

/**
 * Feature flags (spec §15): what's switched on for users, changed by admins
 * in the app rather than by a deploy, and enforced here on the server. The
 * Catalog's visibility and who may use the scanner.
 */

/** A flag's current value: what an admin last set, or its default. */
export async function readFlag<K extends FlagKey>(
  ctx: QueryCtx,
  key: K,
): Promise<FeatureFlags[K]> {
  const flag = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return flag ? (flag.value as FeatureFlags[K]) : flagDefaults[key];
}

/** The signed-in person, or null when signed out. */
async function signedInUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  return userId ? await ctx.db.get("users", userId) : null;
}

/** Every flag's current value, for the admins' flags screen. Admins only. */
export const list = query({
  args: {},
  returns: v.object({
    catalogVisible: v.boolean(),
    scannerAvailability,
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return {
      catalogVisible: await readFlag(ctx, "catalogVisible"),
      scannerAvailability: await readFlag(ctx, "scannerAvailability"),
    };
  },
});

/** Sets one flag, for everyone, at once. Admins only. */
export const set = mutation({
  args: { flag: featureFlag },
  returns: v.null(),
  handler: async (ctx, { flag }) => {
    await requireAdmin(ctx);
    const stored = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", flag.key))
      .unique();
    if (stored) await ctx.db.replace("featureFlags", stored._id, flag);
    else await ctx.db.insert("featureFlags", flag);
    return null;
  },
});

/**
 * Whether this person may see the Catalog: everyone while it's visible, and
 * admins always, so they can keep curating it while it's hidden. Every
 * Catalog query and every way of adding from the Catalog checks this.
 */
export async function catalogVisibleTo(
  ctx: QueryCtx,
  user: Pick<Doc<"users">, "role"> | null,
) {
  return user?.role === "admin" || (await readFlag(ctx, "catalogVisible"));
}

/**
 * Whether the signed-in person sees the Catalog, so navigation (and the
 * Catalog picker in the Item form) can leave it out. Never throws: the app
 * shell asks on every signed-in screen.
 */
export const isCatalogVisible = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => catalogVisibleTo(ctx, await signedInUser(ctx)),
});

/**
 * Whether the signed-in person may use the scanner: nobody while it's off,
 * admins while it's for admins only, and admins plus Premium members during
 * the Premium beta. False when signed out or not set up.
 */
export async function canUseScanner(ctx: QueryCtx) {
  const user = await signedInUser(ctx);
  if (!user?.termsAcceptedAt || !user.homeCurrency) return false;
  const availability = await readFlag(ctx, "scannerAvailability");
  if (availability === "off") return false;
  if (user.role === "admin") return true;
  return (
    availability === "premiumBeta" &&
    (await planOf(ctx, user._id)) === "premium"
  );
}

/** Whether the signed-in person may use the scanner (see canUseScanner). */
export const scannerAvailable = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => canUseScanner(ctx),
});
