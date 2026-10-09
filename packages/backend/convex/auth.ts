import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { resetPasswordCode, verifyEmailCode } from "./accounts/codeEmails";
import { validatePassword } from "./accounts/credentials";
import { passwordProfile } from "./accounts/signUpProfile";

// Google sign-in returns with MUS-685, together with rules for linking it to an
// existing password account. Until then, an unverified password sign-up could
// attach itself to a Google user with the same (verified) email.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: passwordProfile,
      validatePasswordRequirements: validatePassword,
      verify: verifyEmailCode,
      reset: resetPasswordCode,
    }),
  ],
});
