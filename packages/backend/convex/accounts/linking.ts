import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  deleteCollectionCountsOf,
  startCollectionCounts,
} from "../collectionCounts";
import {
  normalizeEmail,
  requireNormalizedEmail,
  startingName,
} from "./credentials";

/**
 * Which user a sign-in belongs to (docs/adr/0005-one-account-per-email.md).
 *
 * - One user per email. A user is *claimed* once the email is proven: a code or
 *   link from that inbox was used, or Google vouches for the address.
 * - Nothing is deleted or replaced before the email is proven, so asking for a
 *   link or starting a sign-up can't disturb anyone else's account.
 * - A password sign-up for a claimed email is refused: typing it proves nothing.
 * - When a method proves the email of an unclaimed user, any other method on it
 *   that was never proven is removed, and the sign-up choices made through it
 *   are reset: whoever started that sign-up may not have owned the inbox.
 */

export const linkingErrors = {
  accountExists: "ACCOUNT_EXISTS",
  emailNotVerified: "EMAIL_NOT_VERIFIED",
} as const;

type SignInKind = "oauth" | "credentials" | "email" | "phone" | "verification";

type Profile = Record<string, unknown> & {
  email?: string;
  emailVerified?: boolean;
};

/** Convex Auth's createOrUpdateUser callback. */
export async function createOrUpdateUser(
  ctx: MutationCtx,
  {
    existingUserId,
    type,
    provider,
    profile: { emailVerified, ...fields },
  }: {
    existingUserId: Id<"users"> | null;
    type: SignInKind;
    provider: { id: string };
    profile: Profile;
  },
): Promise<Id<"users">> {
  // A method this user already has: a returning sign-in, or a code just used.
  if (existingUserId !== null) {
    if (emailVerified) await claim(ctx, existingUserId, provider.id);
    return existingUserId;
  }

  if (type === "oauth" && !emailVerified) {
    throw new ConvexError(linkingErrors.emailNotVerified);
  }
  // Every method keys its account on the email as given, so only accept it
  // normalized: lookalikes ("K" for "k") must not reach someone else's account.
  const email =
    fields.email === undefined
      ? undefined
      : requireNormalizedEmail(fields.email);
  const existing = email ? await userByEmail(ctx, email) : null;

  if (existing === null) {
    const userId = await ctx.db.insert(
      "users",
      newUser(type, fields, email, emailVerified === true),
    );
    await startCollectionCounts(ctx, userId);
    return userId;
  }
  if (type === "credentials") {
    if (existing.emailVerificationTime !== undefined) {
      throw new ConvexError(linkingErrors.accountExists);
    }
    // Joins an unfinished sign-up (say, a sign-in link nobody opened yet) and
    // brings the form's choices; it's proven, or not, by its own code.
    await ctx.db.patch(existing._id, signUpChoices(fields));
    return existing._id;
  }
  // Google, or a sign-in link being sent: join. Google has proven the email;
  // a link proves it only when opened.
  if (emailVerified) await claim(ctx, existing._id, provider.id);
  return existing._id;
}

/** The first record of a person: the sign-up form's profile, or what the provider tells us. */
function newUser(
  type: SignInKind,
  fields: Record<string, unknown>,
  email: string | undefined,
  emailVerified: boolean,
) {
  const proven = emailVerified ? { emailVerificationTime: Date.now() } : {};
  if (type === "credentials") {
    // passwordProfile has already validated these.
    return { ...(fields as Partial<Doc<"users">>), ...proven };
  }
  return {
    ...(email && { email, ...startingName(email) }),
    ...(typeof fields.name === "string" && { name: fields.name }),
    ...(typeof fields.image === "string" && { image: fields.image }),
    ...proven,
  };
}

/** The choices a password sign-up makes on its form (see passwordProfile). */
function signUpChoices(fields: Record<string, unknown>) {
  const { email: _email, ...choices } = fields;
  return choices as Partial<Doc<"users">>;
}

/**
 * The email of an unclaimed user was just proven through `provenBy`. Other
 * methods on the user that never proved it go, with the choices made through
 * them; the person who owns the inbox makes their own on /welcome.
 */
async function claim(ctx: MutationCtx, userId: Id<"users">, provenBy: string) {
  const user = await ctx.db.get(userId);
  if (!user || user.emailVerificationTime !== undefined) return;
  // Only a password sign-up records choices (on its form).
  let choicesWereUnproven = false;
  for (const account of await accountsOf(ctx, userId)) {
    if (account.provider !== provenBy && account.emailVerified === undefined) {
      await deleteAccount(ctx, account);
      if (account.provider === "password") choicesWereUnproven = true;
    }
  }
  await ctx.db.patch(userId, {
    emailVerificationTime: Date.now(),
    ...(choicesWereUnproven && {
      termsAcceptedAt: undefined,
      homeCurrency: undefined,
      language: undefined,
      ...(user.email && startingName(user.email)),
    }),
  });
}

async function userByEmail(ctx: MutationCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalizeEmail(email)))
    .first();
}

/** A user's sign-in methods; a person has a handful at most. */
async function accountsOf(ctx: MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .take(50);
}

async function deleteAccount(ctx: MutationCtx, account: Doc<"authAccounts">) {
  const codes = await ctx.db
    .query("authVerificationCodes")
    .withIndex("accountId", (q) => q.eq("accountId", account._id))
    .take(50);
  for (const code of codes) await ctx.db.delete(code._id);
  // Failed password attempts are counted per sign-in method.
  const failedAttempts = await ctx.db
    .query("authRateLimits")
    .withIndex("identifier", (q) => q.eq("identifier", account._id))
    .unique();
  if (failedAttempts) await ctx.db.delete(failedAttempts._id);
  await ctx.db.delete(account._id);
}

/** Removes every way to sign in as a user, with the codes pending for each. */
export async function deleteSignInMethods(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  for (const account of await accountsOf(ctx, userId))
    await deleteAccount(ctx, account);
}

/** Removes a user with every sign-in method, pending code and email change and their (empty) Collection counts, so the email is free again. */
export async function deleteUserAndSignInMethods(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  await deleteSignInMethods(ctx, userId);
  const changes = await ctx.db
    .query("emailChanges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(20);
  for (const change of changes) await ctx.db.delete(change._id);
  await deleteCollectionCountsOf(ctx, userId);
  await ctx.db.delete(userId);
}

/**
 * What a Google sign-in tells us. Google vouches for an address only when it
 * hosts the mailbox (Gmail, or a Workspace domain, which has `hd`); for other
 * addresses `email_verified` isn't enough to join an existing account.
 */
export function googleProfile(google: {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  hd?: string;
}) {
  const email = normalizeEmail(google.email);
  const hostedByGoogle =
    Boolean(google.hd) || /@(gmail|googlemail)\.com$/.test(email);
  return {
    id: google.sub,
    email,
    emailVerified: google.email_verified && hostedByGoogle,
    name: google.name,
    image: google.picture,
  };
}
