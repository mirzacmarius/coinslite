import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import {
  magicLink,
  resetPasswordCode,
  verifyEmailCode,
} from "./accounts/codeEmails";
import { normalizeEmail, validatePassword } from "./accounts/credentials";
import { createOrUpdateUser } from "./accounts/linking";
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
    Google({
      profile: (google) => ({
        id: google.sub,
        email: normalizeEmail(google.email),
        emailVerified: google.email_verified,
        name: google.name,
        image: google.picture,
      }),
    }),
  ],
  // One account per email, whichever way people sign in (accounts/linking.ts).
  callbacks: { createOrUpdateUser },
});
