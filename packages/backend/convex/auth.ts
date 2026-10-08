import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { resetPasswordCode, verifyEmailCode } from "./accounts/codeEmails";
import { passwordProfile, validatePassword } from "./accounts/signUpProfile";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      profile: passwordProfile,
      validatePasswordRequirements: validatePassword,
      verify: verifyEmailCode,
      reset: resetPasswordCode,
    }),
  ],
});
