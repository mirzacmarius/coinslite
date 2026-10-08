import { ConvexError, type Value } from "convex/values";

export const accountErrors = {
  invalidEmail: "INVALID_EMAIL",
  invalidCode: "INVALID_CODE",
} as const;

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
    throw new ConvexError(accountErrors.invalidEmail);
  }
  return email;
}
