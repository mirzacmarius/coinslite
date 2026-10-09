import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { polarApi } from "./billing/polar";
import {
  billingIntervals,
  fallbackCurrency,
  premiumCurrencies,
  premiumPrices,
} from "./billing/rules";

const productIdSetting = {
  month: "POLAR_PREMIUM_MONTHLY_PRODUCT_ID",
  year: "POLAR_PREMIUM_YEARLY_PRODUCT_ID",
} as const;

/**
 * Creates Premium's Polar products, monthly and yearly, each priced in every
 * currency of `premiumPrices`, unless the organization has them already.
 * Run it once per Polar organization (`bun run seed`), set the product ids it
 * prints on the deployment, and make EUR the organization's default currency
 * in Polar, so buyers elsewhere pay in EUR.
 */
export default internalAction({
  args: {},
  returns: v.null(),
  handler: async () => {
    const polar = polarApi();
    if (!polar) {
      console.info(
        "POLAR_ORGANIZATION_TOKEN isn't set: no Polar products made.",
      );
      return null;
    }
    const existing = await polar.listProducts();
    // The fallback first: it's what buyers see where no local price exists.
    const currencies = [
      fallbackCurrency,
      ...premiumCurrencies.filter((currency) => currency !== fallbackCurrency),
    ];
    for (const interval of billingIntervals) {
      const found = existing.find(
        (product) =>
          product.metadata?.plan === "premium" &&
          product.recurring_interval === interval,
      );
      const product =
        found ??
        (await polar.createProduct({
          name: "Premium",
          description: `Unlimited Items, the Insurance report and exports. Billed ${interval}ly.`,
          recurring_interval: interval,
          metadata: { plan: "premium" },
          prices: currencies.map((currency) => ({
            amount_type: "fixed",
            price_currency: currency.toLowerCase(),
            price_amount: premiumPrices[currency][interval],
          })),
        }));
      console.info(
        `${found ? "Found" : "Created"} Premium (${interval}ly). Set it with: npx convex env set ${productIdSetting[interval]} ${product.id}`,
      );
    }
    return null;
  },
});
