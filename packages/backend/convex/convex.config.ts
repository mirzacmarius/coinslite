import polar from "@convex-dev/polar/convex.config";
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
  },
});
app.use(polar);
app.use(rateLimiter);

export default app;
