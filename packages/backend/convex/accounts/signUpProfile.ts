import { defaultLocale, isHomeCurrency, isLocale } from "@coinslite/i18n";
import { ConvexError, type Value } from "convex/values";
import { requireNormalizedEmail } from "./email";

/** Error codes the sign-up form translates for the user. */
export const signUpErrors = {
  termsNotAccepted: "TERMS_NOT_ACCEPTED",
  invalidHomeCurrency: "INVALID_HOME_CURRENCY",
  passwordTooShort: "PASSWORD_TOO_SHORT",
  passwordTooLong: "PASSWORD_TOO_LONG",
} as const;

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** Checked when a password is chosen: at sign-up and when resetting it. */
export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ConvexError(signUpErrors.passwordTooShort);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new ConvexError(signUpErrors.passwordTooLong);
  }
}

/**
 * The profile stored for a new email/password account. Convex Auth calls this
 * for every password flow; only sign-up stores anything beyond the email.
 */
export function passwordProfile(params: Record<string, Value | undefined>): {
  email: string;
  [field: string]: Value;
} {
  const email = requireNormalizedEmail(params.email);
  if (params.flow !== "signUp") return { email };

  if (params.acceptTerms !== "true") {
    throw new ConvexError(signUpErrors.termsNotAccepted);
  }
  if (!isHomeCurrency(params.homeCurrency)) {
    throw new ConvexError(signUpErrors.invalidHomeCurrency);
  }
  return {
    email,
    displayName: email.slice(0, email.indexOf("@")),
    language: isLocale(params.language) ? params.language : defaultLocale,
    homeCurrency: params.homeCurrency,
    termsAcceptedAt: Date.now(),
  };
}
