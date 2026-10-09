import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import {
  magicLink,
  resetPasswordCode,
  verifyEmailCode,
} from "./accounts/codeEmails";
import { validatePassword } from "./accounts/credentials";
import { createOrUpdateUser, googleProfile } from "./accounts/linking";
import { passwordProfile } from "./accounts/signUpProfile";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
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
