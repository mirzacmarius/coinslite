import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { type Validator, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, type QueryCtx, query } from "../_generated/server";
import { normalizeEmail } from "../accounts/credentials";
import { updatePlanCopies } from "../billing";
import {
  type CollectionCounts,
  collectionCountsOf,
  ensureCollectionCounts,
} from "../collectionCounts";
import { planOf } from "../plans";
import { requireAdmin } from "../utils/auth";
import {
  homeCurrency,
  language,
  planFilter,
  sortOrder,
  userSort,
} from "../utils/validators";
import {
  type PlanFilter,
  type SortOrder,
  type UserSort,
  nameKey,
  userSearchLimit,
  userSearchMatches,
} from "./userList";

/**
 * The admin user list and detail (spec §15): admins look people up to
 * support them. Read-only: nothing here changes anyone.
 */

/** One person in the list. */
const listedUser = v.object({
  userId: v.id("users"),
  name: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  createdAt: v.number(),
  admin: v.boolean(),
  /** Whether they've finished signing up (terms accepted, Home currency chosen). */
  signedUp: v.boolean(),
  plan: v.union(v.literal("premium"), v.literal("free")),
  planEnd: v.union(v.number(), v.null()),
  items: v.number(),
  albums: v.number(),
  lastSignInAt: v.union(v.number(), v.null()),
});

function listed(user: Doc<"users">, counts: CollectionCounts) {
  return {
    userId: user._id,
    name: user.displayName ?? null,
    email: user.email ?? null,
    createdAt: user._creationTime,
    admin: user.role === "admin",
    signedUp:
      user.termsAcceptedAt !== undefined && user.homeCurrency !== undefined,
    plan: user.plan ?? ("free" as const),
    planEnd: user.planEnd ?? null,
    items: counts.items,
    albums: counts.albums,
    lastSignInAt: user.lastSignInAt ?? null,
  };
}

const listArgs = { plan: planFilter, sort: userSort, order: sortOrder };

/** How the copies of the plan (billing.ts) mark each plan: the Free plan leaves it unset. */
const planCopy = { premium: "premium", free: undefined } as const;

type PlanEndCursor = { phase: "ended" | "noEnd"; cursor: string | null };
const planEndCursorPrefix = "planEnd:";
const encodePlanEndCursor = (cursor: PlanEndCursor) =>
  `${planEndCursorPrefix}${encodeURIComponent(JSON.stringify(cursor))}`;
const decodePlanEndCursor = (cursor: string | null): PlanEndCursor => {
  if (!cursor?.startsWith(planEndCursorPrefix))
    return { phase: "ended", cursor };
  return JSON.parse(
    decodeURIComponent(cursor.slice(planEndCursorPrefix.length)),
  ) as PlanEndCursor;
};

/**
 * Plan ends are ordered before people without an end date, in either
 * direction. The cursors are this function's own, so its pages offer the
 * client no split cursor (a split would send an inner cursor back) and ignore
 * an end cursor.
 */
async function planEndPage(
  ctx: QueryCtx,
  plan: PlanFilter,
  order: SortOrder,
  { numItems, cursor }: { cursor: string | null; numItems: number },
) {
  const state = decodePlanEndCursor(cursor);
  const options = { numItems, cursor: state.cursor };
  const userTable = ctx.db.query("users");
  const ended =
    plan === "all"
      ? userTable.withIndex("by_planEnd", (q) =>
          q.gte("planEnd", Number.MIN_SAFE_INTEGER),
        )
      : userTable.withIndex("by_plan_and_planEnd", (q) =>
          q.eq("plan", planCopy[plan]).gte("planEnd", Number.MIN_SAFE_INTEGER),
        );
  const noEnd =
    plan === "all"
      ? userTable.withIndex("by_planEnd", (q) => q.eq("planEnd", undefined))
      : userTable.withIndex("by_plan_and_planEnd", (q) =>
          q.eq("plan", planCopy[plan]).eq("planEnd", undefined),
        );

  if (state.phase === "noEnd") {
    const { page, isDone, continueCursor } = await noEnd
      .order(order)
      .paginate(options);
    return {
      page,
      isDone,
      continueCursor: isDone
        ? continueCursor
        : encodePlanEndCursor({ phase: "noEnd", cursor: continueCursor }),
    };
  }

  const { page, isDone, continueCursor } = await ended
    .order(order)
    .paginate(options);
  if (!isDone) {
    return {
      page,
      isDone,
      continueCursor: encodePlanEndCursor({
        phase: "ended",
        cursor: continueCursor,
      }),
    };
  }

  // Switch streams on the next page. One Convex query may paginate only once,
  // so this page can be shorter when the dated users run out.
  const hasMore = (await noEnd.order(order).take(1)).length > 0;
  return {
    page,
    isDone: !hasMore,
    continueCursor: hasMore
      ? encodePlanEndCursor({ phase: "noEnd", cursor: null })
      : continueCursor,
  };
}

/** The people with one sort and plan filter, through the users index that holds them in that order. */
function usersInOrder(
  ctx: QueryCtx,
  sort: Exclude<UserSort, "items" | "albums">,
  filter: PlanFilter,
  order: SortOrder,
) {
  const users = ctx.db.query("users");
  if (filter === "all") {
    switch (sort) {
      case "name":
        return users.withIndex("by_nameKey").order(order);
      case "email":
        return users.withIndex("email").order(order);
      case "created":
        return users.withIndex("by_creation_time").order(order);
      // Within a plan, newest or oldest first.
      case "plan":
        return users.withIndex("by_plan").order(order);
      case "planEnd":
        return users.withIndex("by_planEnd").order(order);
      case "lastSignIn":
        return users.withIndex("by_lastSignInAt").order(order);
    }
  }
  const plan = planCopy[filter];
  switch (sort) {
    case "name":
      return users
        .withIndex("by_plan_and_nameKey", (q) => q.eq("plan", plan))
        .order(order);
    case "email":
      return users
        .withIndex("by_plan_and_email", (q) => q.eq("plan", plan))
        .order(order);
    // Everyone listed has the same plan, so it's the order they joined in.
    case "created":
    case "plan":
      return users.withIndex("by_plan", (q) => q.eq("plan", plan)).order(order);
    case "planEnd":
      return users
        .withIndex("by_plan_and_planEnd", (q) => q.eq("plan", plan))
        .order(order);
    case "lastSignIn":
      return users
        .withIndex("by_plan_and_lastSignInAt", (q) => q.eq("plan", plan))
        .order(order);
  }
}

/**
 * People by how much they hold, through their Collection counts
 * (collectionCounts.ts), which every account has from the start.
 */
function countsInOrder(
  ctx: QueryCtx,
  sort: "items" | "albums",
  filter: PlanFilter,
  order: SortOrder,
) {
  const counts = ctx.db.query("collectionCounts");
  if (filter === "all") {
    return counts
      .withIndex(sort === "items" ? "by_items" : "by_albums")
      .order(order);
  }
  const plan = planCopy[filter];
  return counts
    .withIndex(
      sort === "items" ? "by_plan_and_items" : "by_plan_and_albums",
      (q) => q.eq("plan", plan),
    )
    .order(order);
}

/**
 * One page of everyone, or of the people on one plan, in the chosen order.
 * Every order and filter reads an index that holds people in that order, so
 * a page reads only its own people, however many there are. Admins only.
 */
export const list = query({
  args: { ...listArgs, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(listedUser),
  handler: async (ctx, { plan, sort, order, paginationOpts }) => {
    await requireAdmin(ctx);
    if (sort === "planEnd") {
      const page = await planEndPage(ctx, plan, order, paginationOpts);
      return {
        ...page,
        page: await Promise.all(
          page.page.map(async (user) =>
            listed(user, await collectionCountsOf(ctx, user._id)),
          ),
        ),
      };
    }
    if (sort === "items" || sort === "albums") {
      const page = await countsInOrder(ctx, sort, plan, order).paginate(
        paginationOpts,
      );
      const users = await Promise.all(
        page.page.map(async (counts) => {
          const user = await ctx.db.get(counts.userId);
          // Counts go with their account; none should be left without one.
          return user && listed(user, counts);
        }),
      );
      return { ...page, page: users.filter((user) => user !== null) };
    }
    const page = await usersInOrder(ctx, sort, plan, order).paginate(
      paginationOpts,
    );
    return {
      ...page,
      // One read per person: accounts have counts from the start, and the
      // hourly stats count gives older ones theirs (updateListedFields).
      page: await Promise.all(
        page.page.map(async (user) =>
          listed(user, await collectionCountsOf(ctx, user._id)),
        ),
      ),
    };
  },
});

/**
 * The people whose name or email matches what the admin typed: a whole
 * email finds just that person; otherwise words of a name or an email or the
 * start of them. Everyone, or one plan's people. Search indexes find the
 * best `userSearchMatches` matches, so a search reads about that many people
 * however many there are; those are sorted here in the chosen order. `more`
 * says there were others. Admins only.
 */
export const search = query({
  args: { ...listArgs, text: v.string() },
  returns: v.object({ users: v.array(listedUser), more: v.boolean() }),
  handler: async (ctx, { text, plan, sort, order }) => {
    await requireAdmin(ctx);
    const words = text.trim().slice(0, userSearchLimit);
    if (!words) return { users: [], more: false };
    const onPlan = (user: Doc<"users">) =>
      plan === "all" || user.plan === planCopy[plan];
    const bestMatches = (field: "displayName" | "fullName" | "email") =>
      ctx.db
        .query("users")
        .withSearchIndex(
          field === "email"
            ? "search_email"
            : field === "fullName"
              ? "search_fullName"
              : "search_displayName",
          (q) => {
            const matches = q.search(field, words);
            return plan === "all"
              ? matches
              : matches.eq("plan", planCopy[plan]);
          },
        )
        .take(userSearchMatches + 1);

    // A whole email belongs to one account (ADR 0005), so it finds just
    // that one. The search indexes split it into words ("ada", "example",
    // "com") and match any of them, which would bring in everyone at the
    // same domain too.
    const exact = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizeEmail(words)))
      .unique();
    if (exact) {
      return {
        users: onPlan(exact)
          ? [listed(exact, await collectionCountsOf(ctx, exact._id))]
          : [],
        more: false,
      };
    }

    // The best of each search in turn.
    const byName = await bestMatches("displayName");
    const byFullName = await bestMatches("fullName");
    const byEmail = await bestMatches("email");
    const found = new Map<Id<"users">, Doc<"users">>();
    for (
      let rank = 0;
      rank < Math.max(byName.length, byFullName.length, byEmail.length);
      rank++
    ) {
      for (const user of [byName[rank], byFullName[rank], byEmail[rank]]) {
        if (user && !found.has(user._id)) found.set(user._id, user);
      }
    }
    const shown = await Promise.all(
      [...found.values()].slice(0, userSearchMatches).map(async (user) => ({
        user,
        counts: await collectionCountsOf(ctx, user._id),
      })),
    );
    shown.sort(inOrder(sort, order));
    return {
      users: shown.map(({ user, counts }) => listed(user, counts)),
      more: found.size > userSearchMatches,
    };
  },
});

type Found = { user: Doc<"users">; counts: CollectionCounts };

/** What each sort compares, as the list's indexes hold it. */
const sortValue: Record<
  UserSort,
  (found: Found) => string | number | undefined
> = {
  name: ({ user }) => user.nameKey,
  email: ({ user }) => user.email,
  created: ({ user }) => user._creationTime,
  plan: ({ user }) => user.plan,
  planEnd: ({ user }) => user.planEnd,
  items: ({ counts }) => counts.items,
  albums: ({ counts }) => counts.albums,
  lastSignIn: ({ user }) => user.lastSignInAt,
};

/**
 * Compares found people the way the list's indexes order them: nothing comes
 * before any value, and equal values go by when the account was created.
 */
function inOrder(sort: UserSort, order: SortOrder) {
  const value = sortValue[sort];
  const compare = (a: string | number | undefined, b: typeof a) =>
    a === b ? 0 : a === undefined ? -1 : b === undefined ? 1 : a < b ? -1 : 1;
  return (a: Found, b: Found) => {
    const ascending =
      compare(value(a), value(b)) ||
      compare(a.user._creationTime, b.user._creationTime);
    return order === "asc" ? ascending : -ascending;
  };
}

const nullable = <T extends Validator<unknown, "required", string>>(value: T) =>
  v.union(value, v.null());

/** Someone's subscription as Polar last reported it. */
const subscriptionDetail = v.object({
  /** Polar's status: active, trialing, past_due, canceled, unpaid, incomplete… */
  status: v.string(),
  /** "month" or "year". */
  interval: v.string(),
  currency: v.string(),
  /** Minor units of `currency`. */
  amount: v.number(),
  /** When CoinsLite first heard of it. */
  startedAt: v.number(),
  currentPeriodEnd: nullable(v.number()),
  cancelAtPeriodEnd: v.boolean(),
  endedAt: nullable(v.number()),
  /** Whether it makes them Premium now. */
  premium: v.boolean(),
});

/**
 * Everything about one person an admin needs to support them: their profile,
 * when they joined, confirmed their email, finished signing up and last
 * signed in, whether they're an admin, their plan and subscription (the one
 * making them Premium, otherwise the latest), and what their Collection
 * holds. Null for an id that names nobody. Admins only.
 */
export const get = query({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      profile: v.object({
        name: nullable(v.string()),
        email: nullable(v.string()),
        fullName: nullable(v.string()),
        contactPhone: nullable(v.string()),
        streetAddress: nullable(v.string()),
        postalCode: nullable(v.string()),
        city: nullable(v.string()),
        country: nullable(v.string()),
        language: nullable(language),
        homeCurrency: nullable(homeCurrency),
      }),
      account: v.object({
        createdAt: v.number(),
        emailVerifiedAt: nullable(v.number()),
        /** When they accepted the terms, finishing sign-up. */
        signedUpAt: nullable(v.number()),
        lastSignInAt: nullable(v.number()),
      }),
      admin: v.boolean(),
      plan: v.union(v.literal("premium"), v.literal("free")),
      subscription: nullable(subscriptionDetail),
      collection: v.object({
        items: v.number(),
        coins: v.number(),
        banknotes: v.number(),
        stamps: v.number(),
        albums: v.number(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const userId = ctx.db.normalizeId("users", args.userId);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    // A handful at most.
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId_and_premium", (q) => q.eq("userId", user._id))
      .take(100);
    const subscription =
      subscriptions.find(({ premium }) => premium) ??
      subscriptions.reduce<Doc<"subscriptions"> | null>(
        (latest, next) =>
          latest && latest.modifiedAt >= next.modifiedAt ? latest : next,
        null,
      );
    return {
      userId: user._id,
      profile: {
        name: user.displayName ?? null,
        email: user.email ?? null,
        fullName: user.fullName ?? null,
        contactPhone: user.contactPhone ?? null,
        streetAddress: user.streetAddress ?? null,
        postalCode: user.postalCode ?? null,
        city: user.city ?? null,
        country: user.country ?? null,
        language: user.language ?? null,
        homeCurrency: user.homeCurrency ?? null,
      },
      account: {
        createdAt: user._creationTime,
        emailVerifiedAt: user.emailVerificationTime ?? null,
        signedUpAt: user.termsAcceptedAt ?? null,
        lastSignInAt: user.lastSignInAt ?? null,
      },
      admin: user.role === "admin",
      plan: await planOf(ctx, user._id),
      subscription: subscription && {
        status: subscription.status,
        interval: subscription.interval,
        currency: subscription.currency,
        amount: subscription.amount,
        startedAt: subscription._creationTime,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        endedAt: subscription.endedAt ?? null,
        premium: subscription.premium,
      },
      collection: await collectionCountsOf(ctx, user._id),
    };
  },
});

/**
 * Brings what the list sorts and filters someone by up to date: the key of
 * their name, the copies of their plan and their Collection counts. Every
 * change keeps these as it happens; this catches accounts from before they
 * were kept. The hourly stats count (admin/stats.ts) runs it for everyone.
 */
export async function updateListedFields(ctx: MutationCtx, user: Doc<"users">) {
  const key =
    user.displayName === undefined ? undefined : nameKey(user.displayName);
  if (user.nameKey !== key) await ctx.db.patch(user._id, { nameKey: key });
  await ensureCollectionCounts(ctx, user._id);
  await updatePlanCopies(ctx, user._id);
}
