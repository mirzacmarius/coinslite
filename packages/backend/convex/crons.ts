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

export default crons;
