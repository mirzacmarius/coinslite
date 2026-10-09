import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  catalogItemType,
  catalogKind,
  gradingScale,
  homeCurrency,
  itemType,
  language,
  material,
  preciousMetal,
  provenance,
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

    /** Admins maintain the Catalog; everyone else has no role. Granted with admin/roles:grant. */
    role: v.optional(v.literal("admin")),

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
