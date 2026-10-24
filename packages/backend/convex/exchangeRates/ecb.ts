import { withTimeout } from "../utils/timeout";
import {
  type DayRates,
  daysBefore,
  lookBackDays,
  quotedCurrencies,
  ratesFromCsv,
} from "./rules";

/**
 * The past-day exchange rate provider: the European Central Bank's data
 * portal (https://data.ecb.europa.eu), whose euro reference rates may be
 * reused with the source named. This is the only module that knows its
 * address. It needs no key.
 */
const DATA_URL = "https://data-api.ecb.europa.eu/service/data/EXR";
/** How long a request may take, answer included, before it counts as failed. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetches the latest euro reference rates of the Home currencies up to
 * `day` ("YYYY-MM-DD"), looking back over the days the ECB doesn't publish.
 * Null when it has none in that time (before 1999); throws when it can't be
 * reached, answers with an error, or takes longer than REQUEST_TIMEOUT_MS.
 */
export async function fetchRates(day: string): Promise<DayRates | null> {
  const series = `D.${quotedCurrencies.join("+")}.EUR.SP00.A`;
  const query = new URLSearchParams({
    startPeriod: daysBefore(day, lookBackDays),
    endPeriod: day,
    format: "csvdata",
  });
  const { response, body } = await withTimeout(
    async (signal) => {
      const response = await fetch(`${DATA_URL}/${series}?${query}`, {
        signal,
      });
      const body = await response.text().catch(() => "");
      return { response, body };
    },
    REQUEST_TIMEOUT_MS,
    `The ECB didn't answer within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
  );
  // The data portal answers 404 when the days asked for have no rates.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`The ECB answered ${response.status} for ${day}`);
  }
  return ratesFromCsv(body, day);
}
