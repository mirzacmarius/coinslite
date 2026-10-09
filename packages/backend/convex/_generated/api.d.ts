/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as account_deletion from "../account/deletion.js";
import type * as account_emailChangeMessages from "../account/emailChangeMessages.js";
import type * as account_rules from "../account/rules.js";
import type * as accounts_codeEmailMessages from "../accounts/codeEmailMessages.js";
import type * as accounts_codeEmails from "../accounts/codeEmails.js";
import type * as accounts_credentials from "../accounts/credentials.js";
import type * as accounts_emails from "../accounts/emails.js";
import type * as accounts_linking from "../accounts/linking.js";
import type * as accounts_profile from "../accounts/profile.js";
import type * as accounts_signUpProfile from "../accounts/signUpProfile.js";
import type * as admin_roles from "../admin/roles.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_statsFigures from "../admin/statsFigures.js";
import type * as albums from "../albums.js";
import type * as albums_membership from "../albums/membership.js";
import type * as albums_rules from "../albums/rules.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billing_polar from "../billing/polar.js";
import type * as billing_rules from "../billing/rules.js";
import type * as billing_webhook from "../billing/webhook.js";
import type * as catalog_browse from "../catalog/browse.js";
import type * as catalog_csv from "../catalog/csv.js";
import type * as catalog_csvText from "../catalog/csvText.js";
import type * as catalog_datasets_euroCommemorativeCoins from "../catalog/datasets/euroCommemorativeCoins.js";
import type * as catalog_datasets_euroCommemoratives from "../catalog/datasets/euroCommemoratives.js";
import type * as catalog_datasets_usSilverDollars from "../catalog/datasets/usSilverDollars.js";
import type * as catalog_editor from "../catalog/editor.js";
import type * as catalog_fields from "../catalog/fields.js";
import type * as catalog_imageRules from "../catalog/imageRules.js";
import type * as catalog_images from "../catalog/images.js";
import type * as catalog_search from "../catalog/search.js";
import type * as catalog_searchWords from "../catalog/searchWords.js";
import type * as catalog_seed from "../catalog/seed.js";
import type * as catalog_tree from "../catalog/tree.js";
import type * as collection from "../collection.js";
import type * as collection_browse from "../collection/browse.js";
import type * as collection_exportLabels from "../collection/exportLabels.js";
import type * as collection_exports from "../collection/exports.js";
import type * as collection_view from "../collection/view.js";
import type * as collectionCounts from "../collectionCounts.js";
import type * as collectionTotals from "../collectionTotals.js";
import type * as crons from "../crons.js";
import type * as email_index from "../email/index.js";
import type * as env from "../env.js";
import type * as featureFlags from "../featureFlags.js";
import type * as featureFlags_rules from "../featureFlags/rules.js";
import type * as feedback from "../feedback.js";
import type * as feedback_rules from "../feedback/rules.js";
import type * as homeCurrency from "../homeCurrency.js";
import type * as homeCurrency_rules from "../homeCurrency/rules.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as insuranceReport from "../insuranceReport.js";
import type * as insuranceReport_messages from "../insuranceReport/messages.js";
import type * as insuranceReport_pdf from "../insuranceReport/pdf.js";
import type * as insuranceReport_rules from "../insuranceReport/rules.js";
import type * as insuranceReport_validators from "../insuranceReport/validators.js";
import type * as insuranceReportPdf from "../insuranceReportPdf.js";
import type * as items from "../items.js";
import type * as items_deletion from "../items/deletion.js";
import type * as items_denominations from "../items/denominations.js";
import type * as items_grades from "../items/grades.js";
import type * as items_preciousMetal from "../items/preciousMetal.js";
import type * as items_rules from "../items/rules.js";
import type * as items_thumbnail from "../items/thumbnail.js";
import type * as items_totals from "../items/totals.js";
import type * as metalValues from "../metalValues.js";
import type * as overview from "../overview.js";
import type * as pdf_fonts from "../pdf/fonts.js";
import type * as pdf_tableDocument from "../pdf/tableDocument.js";
import type * as photos from "../photos.js";
import type * as photos_rules from "../photos/rules.js";
import type * as plans from "../plans.js";
import type * as plans_rules from "../plans/rules.js";
import type * as spotPrices from "../spotPrices.js";
import type * as spotPrices_metalPriceApi from "../spotPrices/metalPriceApi.js";
import type * as spotPrices_rates from "../spotPrices/rates.js";
import type * as testing_premium from "../testing/premium.js";
import type * as updates from "../updates.js";
import type * as updates_releases from "../updates/releases.js";
import type * as users from "../users.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_files from "../utils/files.js";
import type * as utils_validators from "../utils/validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  "account/deletion": typeof account_deletion;
  "account/emailChangeMessages": typeof account_emailChangeMessages;
  "account/rules": typeof account_rules;
  "accounts/codeEmailMessages": typeof accounts_codeEmailMessages;
  "accounts/codeEmails": typeof accounts_codeEmails;
  "accounts/credentials": typeof accounts_credentials;
  "accounts/emails": typeof accounts_emails;
  "accounts/linking": typeof accounts_linking;
  "accounts/profile": typeof accounts_profile;
  "accounts/signUpProfile": typeof accounts_signUpProfile;
  "admin/roles": typeof admin_roles;
  "admin/stats": typeof admin_stats;
  "admin/statsFigures": typeof admin_statsFigures;
  albums: typeof albums;
  "albums/membership": typeof albums_membership;
  "albums/rules": typeof albums_rules;
  auth: typeof auth;
  billing: typeof billing;
  "billing/polar": typeof billing_polar;
  "billing/rules": typeof billing_rules;
  "billing/webhook": typeof billing_webhook;
  "catalog/browse": typeof catalog_browse;
  "catalog/csv": typeof catalog_csv;
  "catalog/csvText": typeof catalog_csvText;
  "catalog/datasets/euroCommemorativeCoins": typeof catalog_datasets_euroCommemorativeCoins;
  "catalog/datasets/euroCommemoratives": typeof catalog_datasets_euroCommemoratives;
  "catalog/datasets/usSilverDollars": typeof catalog_datasets_usSilverDollars;
  "catalog/editor": typeof catalog_editor;
  "catalog/fields": typeof catalog_fields;
  "catalog/imageRules": typeof catalog_imageRules;
  "catalog/images": typeof catalog_images;
  "catalog/search": typeof catalog_search;
  "catalog/searchWords": typeof catalog_searchWords;
  "catalog/seed": typeof catalog_seed;
  "catalog/tree": typeof catalog_tree;
  collection: typeof collection;
  "collection/browse": typeof collection_browse;
  "collection/exportLabels": typeof collection_exportLabels;
  "collection/exports": typeof collection_exports;
  "collection/view": typeof collection_view;
  collectionCounts: typeof collectionCounts;
  collectionTotals: typeof collectionTotals;
  crons: typeof crons;
  "email/index": typeof email_index;
  env: typeof env;
  featureFlags: typeof featureFlags;
  "featureFlags/rules": typeof featureFlags_rules;
  feedback: typeof feedback;
  "feedback/rules": typeof feedback_rules;
  homeCurrency: typeof homeCurrency;
  "homeCurrency/rules": typeof homeCurrency_rules;
  http: typeof http;
  init: typeof init;
  insuranceReport: typeof insuranceReport;
  "insuranceReport/messages": typeof insuranceReport_messages;
  "insuranceReport/pdf": typeof insuranceReport_pdf;
  "insuranceReport/rules": typeof insuranceReport_rules;
  "insuranceReport/validators": typeof insuranceReport_validators;
  insuranceReportPdf: typeof insuranceReportPdf;
  items: typeof items;
  "items/deletion": typeof items_deletion;
  "items/denominations": typeof items_denominations;
  "items/grades": typeof items_grades;
  "items/preciousMetal": typeof items_preciousMetal;
  "items/rules": typeof items_rules;
  "items/thumbnail": typeof items_thumbnail;
  "items/totals": typeof items_totals;
  metalValues: typeof metalValues;
  overview: typeof overview;
  "pdf/fonts": typeof pdf_fonts;
  "pdf/tableDocument": typeof pdf_tableDocument;
  photos: typeof photos;
  "photos/rules": typeof photos_rules;
  plans: typeof plans;
  "plans/rules": typeof plans_rules;
  spotPrices: typeof spotPrices;
  "spotPrices/metalPriceApi": typeof spotPrices_metalPriceApi;
  "spotPrices/rates": typeof spotPrices_rates;
  "testing/premium": typeof testing_premium;
  updates: typeof updates;
  "updates/releases": typeof updates_releases;
  users: typeof users;
  "utils/auth": typeof utils_auth;
  "utils/files": typeof utils_files;
  "utils/validators": typeof utils_validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
