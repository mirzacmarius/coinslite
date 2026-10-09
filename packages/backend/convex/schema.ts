import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  gradingScale,
  homeCurrency,
  itemType,
  language,
  material,
  strike,
} from "./utils/validators";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Profile, set at sign-up
    displayName: v.optional(v.string()),
    language: v.optional(language),
    homeCurrency: v.optional(homeCurrency),
    termsAcceptedAt: v.optional(v.number()),

    // Contact and address, for the Insurance report
    fullName: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    // Not `phone`: Convex Auth keeps that one for phone sign-in.
    contactPhone: v.optional(v.string()),

    // Unused template fields, kept until existing documents are cleaned up
    username: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  }).index("email", ["email"]),

  /** A requested email change, waiting for its link to be opened at the new address. */
  emailChanges: defineTable({
    userId: v.id("users"),
    newEmail: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"]),

  /**
   * What a user owns: one or more identical pieces (Quantity). Money is in
   * minor units of the owner's Home currency; dates are "YYYY-MM-DD".
   */
  items: defineTable({
    ownerId: v.id("users"),
    type: itemType,
    title: v.string(),
    country: v.optional(v.string()),
    year: v.optional(v.number()),
    denomination: v.optional(v.string()),
    series: v.optional(v.string()),
    category: v.optional(v.string()),
    // Which fields suit which Item type: typeOnlyFields in items/rules.ts.
    material: v.optional(material),
    materialNote: v.optional(v.string()),
    mintMark: v.optional(v.string()),
    ruler: v.optional(v.string()),
    mintage: v.optional(v.number()),
    /** Millimetres. */
    diameter: v.optional(v.number()),
    thickness: v.optional(v.number()),
    numistaNumber: v.optional(v.number()),
    // A Grade is a code on its scale (items/grades.ts); both or neither are set.
    grade: v.optional(v.string()),
    gradingScale: v.optional(gradingScale),
    gradeNote: v.optional(v.string()),
    strike: v.optional(strike),
    quantity: v.number(),
    purchasePrice: v.optional(v.number()),
    marketValue: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),

    // Photos, one file per side, private to the owner (photos.ts). The
    // indexes keep each stored file on at most one Item side.
    frontPhoto: v.optional(v.id("_storage")),
    backPhoto: v.optional(v.id("_storage")),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_frontPhoto", ["frontPhoto"])
    .index("by_backPhoto", ["backPhoto"]),

  /**
   * Emails captured instead of sent, on deployments with EMAIL_DELIVERY=outbox
   * (local and CI test runs). Never used in production.
   */
  devOutbox: defineTable({
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    code: v.optional(v.string()),
  }).index("by_to", ["to"]),
});
