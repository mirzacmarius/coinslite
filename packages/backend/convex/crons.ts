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

/** Photo links are issued afresh twice a day, so each works for a day at most (photos/links.ts). */
crons.interval(
  "renew photo links",
  { hours: 12 },
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

/** Free accounts nobody signs in to: their emails, and in the end their deletion (account/inactivity.ts). */
crons.cron(
  "email and delete unused Free accounts",
  "17 9 * * *",
  internal.account.inactivity.sweep,
  {},
);

/** Sign-ups nobody finished, a week on (account/unfinishedSignUps.ts). */
crons.cron(
  "delete unfinished sign-ups",
  "37 9 * * *",
  internal.account.unfinishedSignUps.sweep,
  {},
);

export default crons;
