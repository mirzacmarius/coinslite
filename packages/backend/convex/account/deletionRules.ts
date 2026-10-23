import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/**
 * When an account may be deleted (account/deletion.ts). Pure, so it's tested
 * without the backend.
 */

/**
 * Why an account is deleted without the person there: deactivated and its
 * time up (account/closing.ts), or unused (account/inactivity.ts). Each
 * stage checks it still holds, so reactivating or signing in meanwhile
 * keeps the account.
 */
export const closingReason = v.union(
  v.literal("deactivated"),
  v.literal("unused"),
);
export type ClosingReason = Infer<typeof closingReason>;

/**
 * Whether the account is still due to go for `reason`, or, without one, at
 * the person's own request: either way only while it's deactivated, unless
 * it's going for being unused.
 */
export function stillDue(
  user: Pick<Doc<"users">, "deactivatedAt" | "inactivityNotice" | "plan">,
  reason: ClosingReason | undefined,
) {
  if (reason === "unused")
    return (
      user.inactivityNotice === 12 &&
      user.plan === undefined &&
      user.deactivatedAt === undefined
    );
  return user.deactivatedAt !== undefined;
}

/** Sign-ups nobody finished (account/unfinishedSignUps.ts). */
export const unfinishedSignUpRules = {
  /** How long one is kept for its owner to come back and confirm it: a week. */
  keptFor: 7 * 24 * 60 * 60 * 1000,
  /** How many users one run of the clean-up looks at. */
  sweepBatch: 50,
} as const;

/**
 * Whether a user is a sign-up nobody finished, kept long enough: the email
 * was never proven (no code or link from the inbox was used, and Google
 * didn't vouch for it), so nobody ever signed in, and no role was given.
 * Asking for a sign-in link to a new address, or starting a password
 * sign-up, makes one (docs/adr/0005-one-account-per-email.md).
 */
export function isUnfinishedSignUp(
  user: Pick<
    Doc<"users">,
    | "_creationTime"
    | "emailVerificationTime"
    | "lastSignInAt"
    | "deactivatedAt"
    | "role"
  >,
  now: number,
) {
  return (
    user.emailVerificationTime === undefined &&
    user.lastSignInAt === undefined &&
    user.deactivatedAt === undefined &&
    user.role === undefined &&
    user._creationTime < now - unfinishedSignUpRules.keptFor
  );
}
