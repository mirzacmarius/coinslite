import { ConvexError, type Value } from "convex/values";

/**
 * The rules for what people type to sign in: email, password and the emailed
 * code. Pure, so the app's forms check the same limits before sending.
 */

export const credentialErrors = {
  invalidEmail: "INVALID_EMAIL",
  invalidCode: "INVALID_CODE",
  passwordTooShort: "PASSWORD_TOO_SHORT",
  passwordTooLong: "PASSWORD_TOO_LONG",
} as const;

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** Emailed one-time codes: this many digits, valid for this long. */
export const CODE_LENGTH = 8;
export const CODE_LIFETIME_MINUTES = 15;

/** Email addresses are kept trimmed and in lower case, so sign-in ignores case. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * The email of a sign-in request. Convex Auth keys accounts and codes on the
 * address exactly as sent, so the forms normalize it and anything else is refused.
 */
export function requireNormalizedEmail(value: Value | undefined): string {
  const email = typeof value === "string" ? value : "";
  if (
    email !== normalizeEmail(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new ConvexError(credentialErrors.invalidEmail);
  }
  return email;
}

/** Checked whenever a password is chosen: at sign-up and when resetting it. */
export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ConvexError(credentialErrors.passwordTooShort);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new ConvexError(credentialErrors.passwordTooLong);
  }
}
