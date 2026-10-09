import { defaultLocale, isHomeCurrency, isLocale } from "@coinslite/i18n";
import { ConvexError, type Value } from "convex/values";
import { latestRelease } from "../updates/releases";
import { localPart, requireNormalizedEmail } from "./credentials";

/** Why a sign-up was refused; the backend tests assert on these. */
export const signUpErrors = {
  termsNotAccepted: "TERMS_NOT_ACCEPTED",
  invalidHomeCurrency: "INVALID_HOME_CURRENCY",
} as const;

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
    displayName: localPart(email),
    language: isLocale(params.language) ? params.language : defaultLocale,
    homeCurrency: params.homeCurrency,
    termsAcceptedAt: Date.now(),
    // New accounts see no Updates prompt until the next release.
    lastSeenRelease: latestRelease().version,
  };
}
