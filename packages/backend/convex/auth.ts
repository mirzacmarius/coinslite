import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  magicLink,
  resetPasswordCode,
  verifyEmailCode,
} from "./accounts/codeEmails";
import { validatePassword } from "./accounts/credentials";
import { createOrUpdateUser, googleProfile } from "./accounts/linking";
import { passwordProfile } from "./accounts/signUpProfile";

const convexAuthFunctions = convexAuth({
  providers: [
    Password({
      profile: passwordProfile,
      validatePasswordRequirements: validatePassword,
      verify: verifyEmailCode,
      reset: resetPasswordCode,
    }),
    magicLink,
    // AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET come from the deployment's env.
    Google({ profile: googleProfile }),
  ],
  // One account per email, whichever way people sign in (accounts/linking.ts).
  callbacks: { createOrUpdateUser },
});

export const { auth, signIn, signOut, isAuthenticated } = convexAuthFunctions;

/** Convex Auth's own reads and writes for signing in and out; `store` runs it. */
export const convexAuthStore = convexAuthFunctions.store;

/**
 * Where Convex Auth reads and writes, by name ("auth:store"), whenever
 * someone signs in, out or stays signed in. It runs Convex Auth's own store,
 * then notes the time on the person when that started a session: every way
 * of signing in (password, code, link, Google, after a reset) does. Sessions
 * end at sign-out, so they can't tell when someone last signed in; this can,
 * and the admin user list sorts by it.
 */
export const store = internalMutation({
  // Convex Auth's store checks its own arguments.
  args: { args: v.any() },
  returns: v.any(),
  handler: async (ctx, { args }) => {
    const result: unknown = await ctx.runMutation(
      internal.auth.convexAuthStore,
      { args },
    );
    const startedSession =
      args.type === "verifyCodeAndSignIn" ||
      (args.type === "signIn" && args.sessionId === undefined);
    const userId = signedInUser(result);
    if (startedSession && userId) {
      await ctx.db.patch(userId, { lastSignInAt: Date.now() });
    }
    return result;
  },
});

/** Who a sign-in signed in, from what Convex Auth's store returned; null when it didn't. */
function signedInUser(result: unknown) {
  return typeof result === "object" &&
    result !== null &&
    "userId" in result &&
    typeof result.userId === "string"
    ? (result.userId as Id<"users">)
    : null;
}
