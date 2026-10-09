import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    /**
     * Where the product app runs; links in emails point here. Optional at push
     * time only because a fresh local deployment must push before its env can
     * be set; every deployment sets it.
     */
    SITE_URL: v.optional(v.string()),
    /** "outbox" stores emails in the devOutbox table instead of sending them (local and CI runs). */
    EMAIL_DELIVERY: v.optional(v.literal("outbox")),
    /**
     * The team's inbox for feedback sent from the Account screen. Unset, the
     * feedback is written to the deployment log instead of being emailed.
     */
    FEEDBACK_EMAIL: v.optional(v.string()),
    /**
     * MetalpriceAPI key for Spot prices and exchange rates. Without it the
     * refresh logs a warning and the last stored prices stay in place.
     */
    METALPRICE_API_KEY: v.optional(v.string()),
    /**
     * Polar billing (billing.ts). Until all of the organization token and both
     * Premium product ids are set, the Premium page says checkout isn't
     * available on this deployment; without the webhook secret, Polar's
     * events are refused.
     */
    POLAR_ORGANIZATION_TOKEN: v.optional(v.string()),
    POLAR_WEBHOOK_SECRET: v.optional(v.string()),
    /** "production" charges real cards; anything else uses Polar's sandbox. */
    POLAR_SERVER: v.optional(v.string()),
    POLAR_PREMIUM_MONTHLY_PRODUCT_ID: v.optional(v.string()),
    POLAR_PREMIUM_YEARLY_PRODUCT_ID: v.optional(v.string()),
  },
});
app.use(rateLimiter);

export default app;
