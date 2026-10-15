import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Live gold and silver every 15 minutes, and exchange rates as often as
 * MetalpriceAPI's plan allows (spotPrices.ts), however many people use CoinsLite.
 */
crons.interval(
  "refresh spot prices and exchange rates",
  { minutes: 15 },
  internal.spotPrices.refresh,
  {},
);

/** Admin stats: figures across everyone, counted in the background (admin/stats.ts). */
crons.interval(
  "count admin stats",
  { hours: 1 },
  internal.admin.stats.hourly,
  {},
);

/** Photo links are issued afresh every half hour, so each works for an hour at most (photos/links.ts). */
crons.interval(
  "renew photo links",
  { minutes: 30 },
  internal.photos.links.renew,
  {},
);

/** Home currency changes whose background conversion stopped, retried (homeCurrency.ts). */
crons.interval(
  "resume stalled Home currency changes",
  { minutes: 15 },
  internal.homeCurrency.resumeStalled,
  {},
);

/** Uploads that never became a photo or a Catalog image (uploads.ts). */
crons.interval(
  "delete unused uploads",
  { hours: 1 },
  internal.uploads.sweep,
  {},
);

export default crons;
