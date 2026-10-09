import type { Locale } from "@coinslite/i18n";
import { env } from "../_generated/server";
import { claudeVision } from "./claude";
import type { CoinReading, ScanCandidate, ScanPhoto } from "./rules";

/**
 * The vision model the scanner asks, behind the one interface the rest of
 * the scanner knows. Each answer is null when the model couldn't give one
 * (it declined, timed out, or answered in another shape); the scanner then
 * says it couldn't identify the coin.
 */
export interface CoinVision {
  /** What the photos of both sides show; `language` is the one to title the coin in. */
  read(
    photos: { front: ScanPhoto; back: ScanPhoto },
    language: Locale,
  ): Promise<CoinReading | null>;
  /** The key of the Catalog entry that is this coin, or null when none clearly is. */
  pick(
    reading: CoinReading,
    candidates: ScanCandidate[],
  ): Promise<string | null>;
}

/** The model used when SCANNER_MODEL isn't set. */
export const defaultScannerModel = "claude-opus-5-5";

/** Whether this deployment has what the scanner needs: an Anthropic API key. */
export const scannerConfigured = () => Boolean(env.ANTHROPIC_API_KEY);

let fake: CoinVision | undefined;

/** Tests answer in the vision model's place with `vision`; no argument puts the model back. */
export function fakeCoinVision(vision?: CoinVision) {
  fake = vision;
}

/** The vision model this deployment is configured with. */
export function coinVision(): CoinVision {
  return (
    fake ??
    claudeVision({
      apiKey: env.ANTHROPIC_API_KEY ?? "",
      model: env.SCANNER_MODEL || defaultScannerModel,
    })
  );
}
