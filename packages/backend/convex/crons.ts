import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** One provider request every 15 minutes, however many people use CoinsLite. */
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

/** Uploads that never became a photo or a Catalog image (uploads.ts). */
crons.interval(
  "delete unused uploads",
  { hours: 1 },
  internal.uploads.sweep,
  {},
);

export default crons;
