import { internalAction } from "./_generated/server";
import { polar } from "./subscriptions";

// Create Polar products, the Convex Polar component will sync them
// back to the database via webhook.
export default internalAction(async () => {
  const products = await polar.sdk.products.list({
    isArchived: false,
  });
  // If any unarchived products exist, bail.
  if (products?.result?.items?.length) {
    console.info("🏃‍♂️ Skipping Polar products creation and seeding.");
    return;
  }
  await polar.sdk.products.create({
    name: "Premium",
    description: "CoinsLite Premium, billed monthly.",
    recurringInterval: "month",
    prices: [
      {
        priceAmount: 2000,
        amountType: "fixed",
      },
    ],
  });
  await polar.sdk.products.create({
    name: "Premium",
    description: "CoinsLite Premium, billed yearly.",
    recurringInterval: "year",
    prices: [
      {
        priceAmount: 20000,
        amountType: "fixed",
      },
    ],
  });

  console.info("📦 Polar Products have been successfully created.");
});
