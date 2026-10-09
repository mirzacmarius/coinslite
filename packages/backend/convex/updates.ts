import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { latestRelease, releases } from "./updates/releases";
import { NOT_SIGNED_IN, requireUserId } from "./utils/auth";
import { language } from "./utils/validators";

/** Every release, newest first, with its notes grouped, in the language asked for. */
export const list = query({
  args: { language },
  returns: v.array(
    v.object({
      version: v.string(),
      date: v.string(),
      catalog: v.array(v.string()),
      features: v.array(v.string()),
      improvements: v.array(v.string()),
      fixes: v.array(v.string()),
    }),
  ),
  handler: async (_ctx, { language }) =>
    releases.map(({ version, date, notes }) => {
      const {
        catalog = [],
        features = [],
        improvements = [],
        fixes = [],
      } = notes[language];
      return { version, date, catalog, features, improvements, fixes };
    }),
});

/**
 * What the app tells the person about releases: whether there's one they
 * haven't seen in the list yet (the marker on Account), and the highlights of
 * a new release they haven't been shown. Null when signed out or not set up,
 * so the app shell can ask anywhere.
 */
export const status = query({
  args: { language },
  returns: v.union(
    v.null(),
    v.object({
      unseen: v.boolean(),
      highlights: v.union(
        v.null(),
        v.object({
          version: v.string(),
          date: v.string(),
          lines: v.array(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, { language }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user?.termsAcceptedAt) return null;
    const latest = latestRelease();
    const unseen = user.lastSeenRelease !== latest.version;
    return {
      unseen,
      highlights:
        unseen && user.lastShownHighlights !== latest.version
          ? {
              version: latest.version,
              date: latest.date,
              lines: latest.notes[language].highlights,
            }
          : null,
    };
  },
});

/** The person closed the highlights of the latest release: they aren't shown again. */
export const dismissHighlights = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const { version } = latestRelease();
    if (user.lastShownHighlights !== version) {
      await ctx.db.patch(user._id, { lastShownHighlights: version });
    }
    return null;
  },
});

/** The person opened the list of releases: the latest counts as seen. */
export const markSeen = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const { version } = latestRelease();
    if (user.lastSeenRelease !== version) {
      await ctx.db.patch(user._id, { lastSeenRelease: version });
    }
    return null;
  },
});

async function requireUser(ctx: MutationCtx) {
  const user = await ctx.db.get(await requireUserId(ctx));
  if (!user) throw new ConvexError(NOT_SIGNED_IN);
  return user;
}
