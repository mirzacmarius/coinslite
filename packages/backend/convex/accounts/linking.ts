import type { GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { normalizeEmail } from "./credentials";

/**
 * Which user a sign-in belongs to. See docs/adr/0005-one-account-per-email.md.
 *
 * - One user per email. A user is *claimed* once their email is proven: a
 *   clicked link or code, or Google's verified email.
 * - Google and sign-in links join a claimed user, because they prove the email.
 *   A password sign-up for a claimed email is refused.
 * - An unclaimed user (a sign-up nobody completed) is replaced when another
 *   method starts for its email, so a pending sign-up never decides who owns it.
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
  ctx: GenericMutationCtx<DataModel>,
  {
    existingUserId,
    type,
    profile: { emailVerified, ...fields },
  }: { existingUserId: Id<"users"> | null; type: SignInKind; profile: Profile },
): Promise<Id<"users">> {
  // A method this user already has: a returning sign-in, or a code just verified.
  if (existingUserId !== null) {
    if (emailVerified) await claim(ctx, existingUserId);
    return existingUserId;
  }

  const email =
    typeof fields.email === "string" ? normalizeEmail(fields.email) : undefined;
  if (type === "oauth" && !emailVerified) {
    throw new ConvexError(linkingErrors.emailNotVerified);
  }
  const existing = email ? await userByEmail(ctx, email) : null;
  if (existing?.emailVerificationTime !== undefined) {
    if (type === "credentials")
      throw new ConvexError(linkingErrors.accountExists);
    return existing._id;
  }
  if (existing) await deleteUserAndSignInMethods(ctx, existing._id);

  return await ctx.db.insert(
    "users",
    newUser(type, fields, email, emailVerified === true),
  );
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
    ...(email && { email, displayName: localPart(email) }),
    ...(typeof fields.name === "string" && { name: fields.name }),
    ...(typeof fields.image === "string" && { image: fields.image }),
    ...proven,
  };
}

export const localPart = (email: string) => email.slice(0, email.indexOf("@"));

async function claim(ctx: GenericMutationCtx<DataModel>, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (user && user.emailVerificationTime === undefined) {
    await ctx.db.patch(userId, { emailVerificationTime: Date.now() });
  }
}

async function userByEmail(ctx: GenericMutationCtx<DataModel>, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
}

/** Removes a user with every sign-in method and pending code, so the email is free again. */
export async function deleteUserAndSignInMethods(
  ctx: GenericMutationCtx<DataModel> | MutationCtx,
  userId: Id<"users">,
) {
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .take(20);
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .take(20);
    for (const code of codes) await ctx.db.delete(code._id);
    await ctx.db.delete(account._id);
  }
  await ctx.db.delete(userId);
}
