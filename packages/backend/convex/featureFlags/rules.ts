import type { Infer } from "convex/values";
import type { featureFlag } from "../utils/validators";

/**
 * The feature flags admins switch without a deploy, and what each holds
 * until an admin first sets it. Pure, so the app shares it with the backend.
 */

/** Who may use the scanner: nobody, admins only, or admins and Premium members (the beta). */
export const scannerAvailabilities = ["off", "admins", "premiumBeta"] as const;
export type ScannerAvailability = (typeof scannerAvailabilities)[number];

/** A feature flag as stored: its key and its value. */
export type FeatureFlag = Infer<typeof featureFlag>;
export type FlagKey = FeatureFlag["key"];
/** Every flag's value, by key. */
export type FeatureFlags = {
  [K in FlagKey]: Extract<FeatureFlag, { key: K }>["value"];
};

/** A flag nobody has set yet holds its default: the Catalog shows, the scanner is off. */
export const flagDefaults: FeatureFlags = {
  catalogVisible: true,
  scannerAvailability: "off",
};
