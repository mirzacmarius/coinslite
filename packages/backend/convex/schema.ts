import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  albumColour,
  catalogItemType,
  catalogKind,
  gradingScale,
  homeCurrency,
  itemType,
  language,
  material,
  metal,
  perDollar,
  preciousMetal,
  provenance,
  strike,
} from "./utils/validators";

export default defineSchema({
  ...authTables,
  /**
   * Convex Auth's, plus an index so deleting an account (account/deletion.ts)
   * finds the Google sign-ins its sessions started.
   */
  authVerifiers: defineTable({
    sessionId: v.optional(v.id("authSessions")),
    signature: v.optional(v.string()),
  })
    .index("signature", ["signature"])
    .index("by_sessionId", ["sessionId"]),
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

    /** Admins maintain the Catalog; everyone else has no role. Granted with admin/roles:grant. */
    role: v.optional(v.literal("admin")),

    // Updates (updates/releases.ts): the version of the newest release they've
    // seen in the list (new accounts start at the current one), and of the
    // newest whose highlights they've been shown.
    lastSeenRelease: v.optional(v.string()),
    lastShownHighlights: v.optional(v.string()),

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
    // Precious metal, a coin's only (items/preciousMetal.ts): weight and
    // purity need a metal, and give the Item its Metal value.
    bullion: v.optional(v.boolean()),
    metal: v.optional(metal),
    /** Grams. */
    weight: v.optional(v.number()),
    /** The share of the weight that is the metal, above 0 and at most 1. */
    purity: v.optional(v.number()),
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

    // Album: at most one. Moving an Item in or out keeps the Album's itemCount
    // right (albums/membership.ts).
    albumId: v.optional(v.id("albums")),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_frontPhoto", ["frontPhoto"])
    .index("by_backPhoto", ["backPhoto"])
    .index("by_ownerId_and_albumId", ["ownerId", "albumId"]),

  /**
   * A named group of Items within a Collection. `itemCount` is kept by every
   * write that moves an Item in or out, so lists never count Items one by one.
   */
  albums: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    colour: albumColour,
    itemCount: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  /**
   * The Catalog: a tree of country and Theme roots, grouping nodes and, as
   * leaves, Catalog entries (kind "entry"), the only nodes Items can be created
   * from ("addable"). CoinsLite's own data (ADR 0003):
   * each group of facts records where it comes from. catalog/tree.ts keeps
   * `path` and `searchText` in step with the rest.
   */
  catalogNodes: defineTable({
    /** The node's id in Catalog CSV files, stable across deployments: "us-morgan-dollar-1881-s". */
    key: v.string(),
    /** Absent on roots. */
    parentId: v.optional(v.id("catalogNodes")),
    /** The keys from the root down to this node, joined by "/": every node below starts with `${path}/`. */
    path: v.string(),
    kind: catalogKind,
    title: v.string(),
    /** Order among siblings, ascending. */
    sortOrder: v.number(),
    itemType: v.optional(catalogItemType),
    /** ISO 3166-1 alpha-2. */
    country: v.optional(v.string()),

    // Facts, from the source in factsProvenance
    denomination: v.optional(v.string()),
    series: v.optional(v.string()),
    material: v.optional(material),
    strike: v.optional(strike),
    metal: v.optional(preciousMetal),
    /** Grams. */
    weight: v.optional(v.number()),
    /** Share of the weight that is `metal`, from 0 to 1 (0.9 for 900/1000). */
    fineness: v.optional(v.number()),
    /** Millimetres. */
    diameter: v.optional(v.number()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    factsProvenance: v.optional(provenance),

    // Notes, from the source in notesProvenance
    technicalDetails: v.optional(v.string()),
    historicalNotes: v.optional(v.string()),
    notesProvenance: v.optional(provenance),

    imageUrl: v.optional(v.string()),
    imageProvenance: v.optional(provenance),

    /** A cross-reference only: no Numista data is ever stored (ADR 0003). */
    numistaId: v.optional(v.number()),

    /** Title, denomination, series and country, for the search index. */
    searchText: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_parentId_and_sortOrder", ["parentId", "sortOrder"])
    .index("by_path", ["path"])
    .index("by_kind_and_path", ["kind", "path"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: ["kind", "itemType", "country"],
    }),

  /**
   * The latest Spot prices and exchange rates (spotPrices.ts): one document,
   * replaced by each successful refresh and kept when a refresh fails.
   */
  spotPriceSnapshots: defineTable({
    /** When the provider quoted the prices. */
    quotedAt: v.number(),
    /** When CoinsLite stored them. */
    fetchedAt: v.number(),
    /** The latest refresh attempt, whether or not it succeeded. */
    checkedAt: v.number(),
    perDollar,
  }),

  /**
   * Premium subscriptions as Polar last reported them, one per Polar
   * subscription (billing.ts). Amounts are minor units of `currency`; times are
   * ms. `premium` is the Premium status rule (billing/rules.ts) applied at the
   * last change, switched off by a scheduled check when the paid period runs
   * out, so asking "is this person Premium?" needs no clock.
   */
  subscriptions: defineTable({
    userId: v.id("users"),
    polarId: v.string(),
    polarCustomerId: v.string(),
    productId: v.string(),
    /** Polar's status: active, trialing, past_due, canceled, unpaid, incomplete… */
    status: v.string(),
    /** Polar's billing interval: "month" or "year" for Premium. */
    interval: v.string(),
    /** Upper-case ISO code, e.g. "NOK". */
    currency: v.string(),
    amount: v.number(),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    endedAt: v.optional(v.number()),
    /** When Polar last changed it; older events are ignored. */
    modifiedAt: v.number(),
    premium: v.boolean(),
    /** When Premium runs out unless Polar reports a renewal; unset if open-ended or not Premium. */
    premiumUntil: v.optional(v.number()),
    /** The scheduled check that ends Premium at `premiumUntil`. */
    premiumCheck: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_polarId", ["polarId"])
    .index("by_userId_and_premium", ["userId", "premium"]),

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
