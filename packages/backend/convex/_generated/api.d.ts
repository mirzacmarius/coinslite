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
import type * as account_emailChangeMessages from "../account/emailChangeMessages.js";
import type * as account_rules from "../account/rules.js";
import type * as accounts_codeEmailMessages from "../accounts/codeEmailMessages.js";
import type * as accounts_codeEmails from "../accounts/codeEmails.js";
import type * as accounts_credentials from "../accounts/credentials.js";
import type * as accounts_emails from "../accounts/emails.js";
import type * as accounts_linking from "../accounts/linking.js";
import type * as accounts_profile from "../accounts/profile.js";
import type * as accounts_signUpProfile from "../accounts/signUpProfile.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as email_index from "../email/index.js";
import type * as env from "../env.js";
import type * as feedback from "../feedback.js";
import type * as feedback_rules from "../feedback/rules.js";
import type * as homeCurrency from "../homeCurrency.js";
import type * as homeCurrency_rules from "../homeCurrency/rules.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as items from "../items.js";
import type * as items_grades from "../items/grades.js";
import type * as items_rules from "../items/rules.js";
import type * as plans from "../plans.js";
import type * as plans_rules from "../plans/rules.js";
import type * as spotPrices from "../spotPrices.js";
import type * as spotPrices_metalPriceApi from "../spotPrices/metalPriceApi.js";
import type * as spotPrices_rates from "../spotPrices/rates.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_validators from "../utils/validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  "account/emailChangeMessages": typeof account_emailChangeMessages;
  "account/rules": typeof account_rules;
  "accounts/codeEmailMessages": typeof accounts_codeEmailMessages;
  "accounts/codeEmails": typeof accounts_codeEmails;
  "accounts/credentials": typeof accounts_credentials;
  "accounts/emails": typeof accounts_emails;
  "accounts/linking": typeof accounts_linking;
  "accounts/profile": typeof accounts_profile;
  "accounts/signUpProfile": typeof accounts_signUpProfile;
  auth: typeof auth;
  crons: typeof crons;
  "email/index": typeof email_index;
  env: typeof env;
  feedback: typeof feedback;
  "feedback/rules": typeof feedback_rules;
  homeCurrency: typeof homeCurrency;
  "homeCurrency/rules": typeof homeCurrency_rules;
  http: typeof http;
  init: typeof init;
  items: typeof items;
  "items/grades": typeof items_grades;
  "items/rules": typeof items_rules;
  plans: typeof plans;
  "plans/rules": typeof plans_rules;
  spotPrices: typeof spotPrices;
  "spotPrices/metalPriceApi": typeof spotPrices_metalPriceApi;
  "spotPrices/rates": typeof spotPrices_rates;
  subscriptions: typeof subscriptions;
  users: typeof users;
  "utils/auth": typeof utils_auth;
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
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
