/**
 * The admin user list (spec §15): how it can be searched, filtered and
 * sorted. Pure, so the app shares it.
 */

/** What the list can be sorted by. */
export const userSorts = [
  "name",
  "email",
  "created",
  "plan",
  "planEnd",
  "items",
  "albums",
  "lastSignIn",
] as const;
export type UserSort = (typeof userSorts)[number];

export const sortOrders = ["asc", "desc"] as const;
export type SortOrder = (typeof sortOrders)[number];

/**
 * The order a sort starts in: names and emails A to Z, plan ends soonest
 * first, everything else largest or newest first (Premium before the Free
 * plan).
 */
export const firstOrder: Record<UserSort, SortOrder> = {
  name: "asc",
  email: "asc",
  created: "desc",
  plan: "desc",
  planEnd: "asc",
  items: "desc",
  albums: "desc",
  lastSignIn: "desc",
};

/** The list's sort until the admin picks another: newest accounts first. */
export const defaultUserSort: UserSort = "created";

/** Which plan the list is narrowed to. */
export const planFilters = ["all", "premium", "free"] as const;
export type PlanFilter = (typeof planFilters)[number];

/** Longer searches are cut to this many characters. */
export const userSearchLimit = 100;

/**
 * The most people one search shows. A search looks for particular people,
 * so the best matches are enough; the admin narrows it to find others.
 */
export const userSearchMatches = 50;

/**
 * A display name as the list sorts it: in lower case, without accents, so
 * "Émile" sorts between "emil" and "Erik" and capitals don't come first.
 */
export const nameKey = (displayName: string) =>
  displayName.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
