import { ConvexError, type Value } from "convex/values";
import { nameKey } from "../admin/userList";

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

/** "ada" for "ada@example.com": the display name a new account starts with. */
export const localPart = (email: string) => email.slice(0, email.indexOf("@"));

/**
 * The inbox an address delivers to, which code emails are counted by: case
 * and a "+tag" make no other inbox, and at Gmail, which ignores them, nor do
 * dots. "A.da+coins@googlemail.com" is "ada@gmail.com".
 */
export function mailboxOf(email: string) {
  const address = normalizeEmail(email);
  const at = address.lastIndexOf("@");
  if (at < 1) return address;
  let local = address.slice(0, at);
  let domain = address.slice(at + 1);
  const tag = local.indexOf("+");
  if (tag > 0) local = local.slice(0, tag);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replaceAll(".", "");
  return `${local}@${domain}`;
}

/** A new account's display name, with the key the admin user list sorts it by. */
export function startingName(email: string) {
  const displayName = localPart(email);
  return { displayName, nameKey: nameKey(displayName) };
}

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
