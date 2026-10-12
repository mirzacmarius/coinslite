import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { statsFigures, statsTable } from "./admin/statsFigures";
import {
  albumColour,
  catalogDetails,
  catalogItemType,
  catalogKind,
  coinEdge,
  composition,
  featureFlag,
  grader,
  gradingScale,
  homeCurrency,
  itemType,
  language,
  material,
  metal,
  notesTranslations,
  perDollar,
  preciousMetal,
  provenance,
  stampCatalogue,
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
    /** When `language` last changed, so a device can tell a newer choice from an old one. */
    languageChangedAt: v.optional(v.number()),
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

    // The admin user list (admin/users.ts) sorts and filters by these. The
    // plan fields are copies: read someone's plan with planOf (plans.ts).
    /** The display name as the list sorts it (`nameKey` in admin/userList.ts). */
    nameKey: v.optional(v.string()),
    /** Set while they're on Premium, unset on the Free plan. Kept by billing.ts. */
    plan: v.optional(v.literal("premium")),
    /** When their Premium's current paid period ends, if it has an end. Kept by billing.ts. */
    planEnd: v.optional(v.number()),
    /** When they last signed in, on any device (auth.ts). */
    lastSignInAt: v.optional(v.number()),

    // Unused template fields, kept until existing documents are cleaned up
    username: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  })
    .index("email", ["email"])
    // The admin user list's orders, across everyone and within one plan.
    .index("by_nameKey", ["nameKey"])
    .index("by_plan_and_nameKey", ["plan", "nameKey"])
    .index("by_plan_and_email", ["plan", "email"])
    .index("by_plan", ["plan"])
    .index("by_planEnd", ["planEnd"])
    .index("by_plan_and_planEnd", ["plan", "planEnd"])
    .index("by_lastSignInAt", ["lastSignInAt"])
    .index("by_plan_and_lastSignInAt", ["plan", "lastSignInAt"])
    .searchIndex("search_displayName", {
      searchField: "displayName",
      filterFields: ["plan"],
    })
    .searchIndex("search_fullName", {
      searchField: "fullName",
      filterFields: ["plan"],
    })
    .searchIndex("search_email", {
      searchField: "email",
      filterFields: ["plan"],
    }),

  /**
   * The Wantlist (wants.ts): a Catalog entry a person is looking for, wanted
   * since `_creationTime`. One per entry per person; adding an Item linked
   * to the entry removes it.
   */
  wants: defineTable({
    ownerId: v.id("users"),
    catalogEntryId: v.id("catalogNodes"),
    /**
     * The entry's key, which never changes, so listing what a person wants
     * reads no Catalog entries. Absent on wants from before it was stored
     * (until `wants:backfillKeys` has run), and on wants of an entry since
     * turned into a grouping.
     */
    catalogEntryKey: v.optional(v.string()),
    note: v.optional(v.string()),
  })
    .index("by_ownerId_and_catalogEntryId", ["ownerId", "catalogEntryId"])
    // Everyone's wants of an entry, removed as it leaves the Catalog.
    .index("by_catalogEntryId", ["catalogEntryId"]),

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
    // Catalogue and certification (items/references.ts): a coin's or
    // banknote's Certification, a stamp's catalogue number and printing, a
    // banknote's serial number and printing. A typed grader or catalogue
    // name is kept only for "other".
    grader: v.optional(grader),
    graderName: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    stampCatalogue: v.optional(stampCatalogue),
    stampCatalogueName: v.optional(v.string()),
    stampCatalogueNumber: v.optional(v.string()),
    perforation: v.optional(v.string()),
    watermark: v.optional(v.string()),
    colour: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    signatures: v.optional(v.string()),
    printer: v.optional(v.string()),
    quantity: v.number(),
    purchasePrice: v.optional(v.number()),
    marketValue: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),

    // The sale (items/rules.ts checkSale): an Item with a sold-on date is
    // sold, otherwise owned. The sale price is per piece, like the Purchase
    // price.
    soldOn: v.optional(v.string()),
    salePrice: v.optional(v.number()),
    saleNote: v.optional(v.string()),

    // Photos, one file per side, private to the owner (photos.ts); more
    // photos are in itemPhotos. The indexes keep each stored file on at most
    // one Item side. Each photo's thumbnail is the small copy lists show
    // (photos/rules.ts listImageFile); photos from before thumbnails have none.
    frontPhoto: v.optional(v.id("_storage")),
    frontThumbnail: v.optional(v.id("_storage")),
    backPhoto: v.optional(v.id("_storage")),
    backThumbnail: v.optional(v.id("_storage")),

    // When the pieces were first added, for an Item split off by a sale
    // (items.ts sell): the original's start, so its months before the sale
    // still count. Absent otherwise: the Item started at `_creationTime`.
    addedAt: v.optional(v.number()),

    // Album: at most one. Moving an Item in or out keeps the Album's itemCount
    // right (albums/membership.ts).
    albumId: v.optional(v.id("albums")),

    // The Catalog entry the Item was created from (ADR 0001), if any. The
    // Catalog shows how many of each entry a person holds from this link.
    catalogEntryId: v.optional(v.id("catalogNodes")),
    // The entry's facts Items have no field for, frozen when the entry left
    // the Catalog (catalog/linkedItems.ts), so the Item page still shows
    // them. A linked Item reads them live from its entry instead.
    catalogDetails: v.optional(catalogDetails),
  })
    .index("by_ownerId", ["ownerId"])
    // Owned Items are those without a sold-on date, for the Free plan count.
    .index("by_ownerId_and_soldOn", ["ownerId", "soldOn"])
    .index("by_frontPhoto", ["frontPhoto"])
    .index("by_backPhoto", ["backPhoto"])
    .index("by_frontThumbnail", ["frontThumbnail"])
    .index("by_backThumbnail", ["backThumbnail"])
    .index("by_ownerId_and_albumId", ["ownerId", "albumId"])
    // With `soldOn` undefined, what a person still owns of one Catalog entry
    // (held counts, Set completion) or in one Album (the Insurance report's
    // Album scopes).
    .index("by_ownerId_and_catalogEntryId_and_soldOn", [
      "ownerId",
      "catalogEntryId",
      "soldOn",
    ])
    .index("by_ownerId_and_albumId_and_soldOn", [
      "ownerId",
      "albumId",
      "soldOn",
    ])
    // Everyone's Items linked to one Catalog entry, for the admins' Catalog
    // editor: a new Item type reaches them, and deleting the entry leaves them
    // its facts (catalog/linkedItems.ts).
    .index("by_catalogEntryId", ["catalogEntryId"]),

  /**
   * An Item's photos besides its two sides, at most `photoLimits.more` per
   * Item, shown in the order they were added (photos.ts). Private to the
   * owner like the sides; each stored file is on at most one document.
   * `thumbnailId` is the photo's small copy, absent on photos from before
   * thumbnails.
   */
  itemPhotos: defineTable({
    itemId: v.id("items"),
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
    thumbnailId: v.optional(v.id("_storage")),
  })
    .index("by_itemId", ["itemId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_storageId", ["storageId"])
    .index("by_thumbnailId", ["thumbnailId"]),

  /**
   * A named group of Items within a Collection. `itemCount` and
   * `soldItemCount` are kept by every write that moves an Item in or out,
   * sells it or makes it owned again (albums/membership.ts), so lists never
   * count Items one by one.
   */
  albums: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    colour: albumColour,
    itemCount: v.number(),
    // How many of those Items are sold. Albums from before it was kept have
    // none until a write counts them; until then reads count them.
    soldItemCount: v.optional(v.number()),
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
    /** Where it was struck: "Carson City". */
    mint: v.optional(v.string()),
    /** "CC", or "none" for a coin with no mint mark. */
    mintMark: v.optional(v.string()),
    composition: v.optional(composition),
    edge: v.optional(coinEdge),
    /** The words on a lettered edge, as struck. */
    edgeLettering: v.optional(v.string()),
    /** Millimetres: a coin's thickness, a banknote's width and height. */
    thickness: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    designers: v.optional(v.array(v.string())),
    /** How many were struck or printed. */
    mintage: v.optional(v.number()),
    /** YYYY-MM-DD, YYYY-MM or YYYY, as precisely as the source says. */
    issueDate: v.optional(v.string()),
    /** When it stopped being legal tender, as precisely as the source says. */
    withdrawalDate: v.optional(v.string()),
    factsProvenance: v.optional(provenance),

    // Notes, from the source in notesProvenance, in notesLanguage
    technicalDetails: v.optional(v.string()),
    historicalNotes: v.optional(v.string()),
    notesProvenance: v.optional(provenance),
    /** A language code; English when absent, as every note stored before it was. */
    notesLanguage: v.optional(v.string()),
    /** The notes in the app's other languages, each translation credited. */
    notesTranslations: v.optional(notesTranslations),

    // The image: one an admin uploaded (catalog/images.ts), else one linked
    // from a Catalog CSV file, credited in imageProvenance.
    imageUrl: v.optional(v.string()),
    imageProvenance: v.optional(provenance),
    /** An uploaded image as WebP files: full size and a thumbnail. */
    imageFiles: v.optional(
      v.object({ full: v.id("_storage"), thumbnail: v.id("_storage") }),
    ),

    /** A cross-reference only: no Numista data is ever stored (ADR 0003). */
    numistaId: v.optional(v.number()),

    /** Title, denomination, series and country, for the search index. */
    searchText: v.string(),

    // For browsing (catalog/browse.ts), kept by catalog/tree.ts:
    /** Roots and groupings: how many Catalog entries sit anywhere below. */
    entryCount: v.optional(v.number()),
    /**
     * The key of the country the node is browsed under: its country root, or
     * below a Theme, the Theme's child. Absent on Theme roots.
     */
    countryNodeKey: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_parentId_and_sortOrder", ["parentId", "sortOrder"])
    .index("by_path", ["path"])
    .index("by_kind_and_path", ["kind", "path"])
    .index("by_parentId_and_kind_and_yearFrom_and_sortOrder", [
      "parentId",
      "kind",
      "yearFrom",
      "sortOrder",
    ])
    .index("by_kind_countryNodeKey_denomination_series_yearFrom_sortOrder", [
      "kind",
      "countryNodeKey",
      "denomination",
      "series",
      "yearFrom",
      "sortOrder",
    ])
    // So each stored file is on at most one entry (utils/files.ts).
    .index("by_imageFiles_full", ["imageFiles.full"])
    .index("by_imageFiles_thumbnail", ["imageFiles.thumbnail"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: ["kind", "itemType", "country"],
    }),

  /**
   * Each Catalog entry's slim entry (items/catalogFacts.ts SlimEntry): its
   * key, title and the facts Items take from it, without notes, image or
   * sources, so resolving every Item in a Collection reads little
   * (items/resolve.ts). A read model of the entry, never edited on its own
   * (ADR 0008): catalog/tree.ts writes it with every entry it writes, and
   * deletes it when the node stops being an entry or leaves the Catalog.
   * Entries from before it existed have none until
   * `catalog/slimEntries:backfill` has run; readers then read the entry.
   */
  catalogSlimEntries: defineTable({
    entryId: v.id("catalogNodes"),
    key: v.string(),
    title: v.string(),
    itemType: v.optional(catalogItemType),
    country: v.optional(v.string()),
    denomination: v.optional(v.string()),
    series: v.optional(v.string()),
    material: v.optional(material),
    strike: v.optional(strike),
    metal: v.optional(preciousMetal),
    weight: v.optional(v.number()),
    fineness: v.optional(v.number()),
    diameter: v.optional(v.number()),
    thickness: v.optional(v.number()),
    mintMark: v.optional(v.string()),
    mintage: v.optional(v.number()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    numistaId: v.optional(v.number()),
  }).index("by_entryId", ["entryId"]),

  /**
   * How many Catalog entries a country holds of one denomination and series
   * of it, on its denomination path (catalog/denominationCounts.ts): the Set
   * "View as Set" opens from an entry right below a country. Absent
   * denomination or series is "none", as on the entries. catalog/tree.ts
   * keeps it in step; one without a count isn't counted yet (before
   * `catalog/denominationCounts:backfill`).
   */
  catalogDenominationCounts: defineTable({
    countryNodeKey: v.string(),
    denomination: v.optional(v.string()),
    series: v.optional(v.string()),
    /** At most one past `setLimits.entries` (setRules.ts): any more is too large to be a Set. */
    entryCount: v.number(),
  }).index("by_countryNodeKey_and_denomination_and_series", [
    "countryNodeKey",
    "denomination",
    "series",
  ]),

  /**
   * Market value history (items/valueHistory.ts): an Item's Market value per
   * piece and Quantity from `at` on, recorded whenever either changes, in
   * minor units of the owner's Home currency (a change of it converts these
   * too). "Value over time" reads each month's latest.
   */
  marketValueHistory: defineTable({
    ownerId: v.id("users"),
    itemId: v.id("items"),
    at: v.number(),
    marketValue: v.optional(v.number()),
    quantity: v.number(),
  })
    .index("by_itemId_and_at", ["itemId", "at"])
    .index("by_ownerId", ["ownerId"]),

  /**
   * The first good Spot prices of each day, kept for good (spotPrices.ts
   * record), with the whole per-dollar table so any Home currency can be
   * worked out later: "Value over time" prices metal at each month's.
   */
  spotPriceDays: defineTable({
    /** "YYYY-MM-DD", UTC. */
    day: v.string(),
    quotedAt: v.number(),
    perDollar,
  }).index("by_day", ["day"]),

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
    /** The provider plan's monthly request quota, when it states one; refreshes are spaced to fit it. */
    requestsPerMonth: v.optional(v.number()),
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
   * Feature flags admins switch in the app (featureFlags.ts): one document per
   * flag that has been set; a flag without one holds its default.
   */
  featureFlags: defineTable(featureFlag).index("by_key", ["key"]),

  /**
   * How many Items (in all and of each Item type) and Albums each person has:
   * one document per person, kept by every write that adds, removes or
   * retypes their Items or Albums (collectionCounts.ts), so figures across
   * everyone never count Items one by one. The `items` and `albums` indexes
   * list people by how much they hold, in the admin user list.
   */
  collectionCounts: defineTable({
    userId: v.id("users"),
    items: v.number(),
    coins: v.number(),
    banknotes: v.number(),
    stamps: v.number(),
    albums: v.number(),
    /** A copy of the person's plan, for listing one plan's people by how much they hold. Kept by billing.ts. */
    plan: v.optional(v.literal("premium")),
  })
    .index("by_userId", ["userId"])
    .index("by_items", ["items"])
    .index("by_albums", ["albums"])
    .index("by_plan_and_items", ["plan", "items"])
    .index("by_plan_and_albums", ["plan", "albums"]),

  /**
   * Admin stats (admin/stats.ts): figures across everyone, counted in the
   * background a batch per transaction. Admins see the newest finished count;
   * one in progress has no `finishedAt` yet and carries where it has got to.
   */
  adminStats: defineTable({
    /** When the count began; "the last 30 days" and the like count back from here. */
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    /** The table being counted and the cursor into it; unset once finished. */
    progress: v.optional(
      v.object({
        table: statsTable,
        cursor: v.union(v.string(), v.null()),
      }),
    ),
    figures: statsFigures,
  }).index("by_finishedAt", ["finishedAt"]),

  /**
   * When photo links are issued as of, and the secret they're signed with on
   * a deployment without PHOTO_LINK_SECRET (photos/links.ts): one document.
   */
  photoLinkKeys: defineTable({
    issuedAt: v.number(),
    fallbackSecret: v.string(),
  }),

  /**
   * Uploads someone registered but hasn't made a photo or a Catalog image yet
   * (utils/files.ts): only they can put one to that use. The hourly clean-up
   * deletes those older than an hour (uploads.ts); deleting the account
   * deletes theirs.
   */
  uploads: defineTable({
    storageId: v.id("_storage"),
    ownerId: v.id("users"),
    purpose: v.union(v.literal("photo"), v.literal("catalogImage")),
  })
    .index("by_storageId", ["storageId"])
    .index("by_ownerId", ["ownerId"]),

  /**
   * A Polar checkout someone has open (billing.ts): at most one per person, so
   * asking again sends them back to it instead of opening a second one that
   * could be paid as well. Without a `url` it is still being opened.
   */
  pendingCheckouts: defineTable({
    userId: v.id("users"),
    interval: v.union(v.literal("month"), v.literal("year")),
    url: v.optional(v.string()),
    expiresAt: v.number(),
  }).index("by_userId", ["userId"]),

  /**
   * Accounts being deleted, then deleted (account/deletion.ts). While
   * `closedAt` is unset the deletion is under way and no checkout opens; after
   * it, the record stays, naming no one but the old account id, so a Polar
   * subscription reported for the deleted account later is ended at Polar.
   */
  accountClosures: defineTable({
    userId: v.id("users"),
    closedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

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
