import { type Infer, v } from "convex/values";

/**
 * The figures on the admin Stats screen (spec §15), as one count stores them.
 * admin/stats.ts says what each one counts.
 */
export const statsFigures = v.object({
  users: v.object({
    total: v.number(),
    newLast30Days: v.number(),
    premium: v.number(),
    free: v.number(),
  }),
  subscriptions: v.object({
    active: v.number(),
    endingWithin30Days: v.number(),
    ended: v.number(),
  }),
  collection: v.object({
    items: v.number(),
    coins: v.number(),
    banknotes: v.number(),
    stamps: v.number(),
    albums: v.number(),
  }),
  activity: v.object({
    itemsAddedLast24Hours: v.number(),
    itemsAddedLast7Days: v.number(),
    albumsCreatedLast30Days: v.number(),
  }),
});
export type StatsFigures = Infer<typeof statsFigures>;

/** Where a count starts: nothing counted yet. */
export const noFigures = (): StatsFigures => ({
  users: { total: 0, newLast30Days: 0, premium: 0, free: 0 },
  subscriptions: { active: 0, endingWithin30Days: 0, ended: 0 },
  collection: { items: 0, coins: 0, banknotes: 0, stamps: 0, albums: 0 },
  activity: {
    itemsAddedLast24Hours: 0,
    itemsAddedLast7Days: 0,
    albumsCreatedLast30Days: 0,
  },
});

/** The tables a count goes through, in order, a batch at a time. */
export const statsTables = [
  "users",
  "subscriptions",
  "items",
  "albums",
] as const;
export const statsTable = v.union(
  v.literal("users"),
  v.literal("subscriptions"),
  v.literal("items"),
  v.literal("albums"),
);
export type StatsTable = Infer<typeof statsTable>;
