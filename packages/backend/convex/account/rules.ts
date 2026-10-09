import { isCountryCode } from "@coinslite/i18n";
import { ConvexError } from "convex/values";

/** What the Account screen's contact form may hold. Pure, so the form checks the same limits. */

export const contactErrors = {
  displayNameRequired: "DISPLAY_NAME_REQUIRED",
  tooLong: "TOO_LONG",
  invalidCountry: "INVALID_COUNTRY",
  invalidPhone: "INVALID_PHONE",
} as const;

export const contactLimits = {
  displayName: 60,
  fullName: 120,
  streetAddress: 200,
  postalCode: 20,
  city: 100,
  contactPhone: 32,
} as const;

export type ContactInput = {
  displayName: string;
  fullName?: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactPhone?: string;
};

/** Digits with the usual separators, optionally starting with +, e.g. "+47 22 12 34 56". */
const PHONE = /^\+?[0-9][0-9 ()./-]*$/;

/** Checks and tidies contact details; an emptied field is cleared. */
export function checkContact(input: ContactInput) {
  const text = (value: string | undefined, limit: number) => {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length > limit) throw new ConvexError(contactErrors.tooLong);
    return trimmed || undefined;
  };
  const displayName = text(input.displayName, contactLimits.displayName);
  if (!displayName) throw new ConvexError(contactErrors.displayNameRequired);
  const country = input.country?.trim().toUpperCase() || undefined;
  if (country !== undefined && !isCountryCode(country)) {
    throw new ConvexError(contactErrors.invalidCountry);
  }
  const contactPhone = text(input.contactPhone, contactLimits.contactPhone);
  if (contactPhone !== undefined && !PHONE.test(contactPhone)) {
    throw new ConvexError(contactErrors.invalidPhone);
  }
  return {
    displayName,
    fullName: text(input.fullName, contactLimits.fullName),
    streetAddress: text(input.streetAddress, contactLimits.streetAddress),
    postalCode: text(input.postalCode, contactLimits.postalCode),
    city: text(input.city, contactLimits.city),
    country,
    contactPhone,
  };
}
