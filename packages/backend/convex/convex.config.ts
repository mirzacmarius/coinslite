import polar from "@convex-dev/polar/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    /** Where the product app runs; links in emails point here. */
    SITE_URL: v.string(),
    /** "outbox" stores emails in the devOutbox table instead of sending them (local and CI runs). */
    EMAIL_DELIVERY: v.optional(v.literal("outbox")),
  },
});
app.use(polar);

export default app;
