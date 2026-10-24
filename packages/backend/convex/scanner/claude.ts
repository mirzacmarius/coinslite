import Anthropic from "@anthropic-ai/sdk";
import type { Locale } from "@coinslite/i18n";
import { type GradingScale, gradingScales } from "../items/grades";
import {
  type ScanCandidate,
  type ScanReading,
  pickFrom,
  pickSchema,
  readingFrom,
  readingSchema,
} from "./rules";
import type { ScanVision } from "./vision";

/**
 * The scanner's vision model: Anthropic's Claude, through its API. Each
 * question is one request whose answer is held to a JSON schema; a request
 * that's declined, cut short, times out or fails answers null.
 */

/** Models that accept server-side fallbacks: a declined request is retried on another model. */
const modelsWithFallbacks = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-sonnet-5-5",
]);

/** The language to title the piece in, by name. */
const languageNames: Record<Locale, string> = {
  en: "English",
  nb: "Norwegian Bokmål",
  de: "German",
  fr: "French",
  ro: "Romanian",
};

/** A scale's Grades, best first, as the instructions list them. */
const codes = (scale: GradingScale) => gradingScales[scale].grades.join(", ");

const readingInstructions = (language: Locale) =>
  [
    "You identify coins and banknotes for a collector's catalogue app.",
    "The first photo shows the front (obverse) of one coin or banknote, the second its back (reverse).",
    "Read what the photos show and fill in the fields. Use null for anything you can't tell from the photos; don't guess.",
    'itemType: "coin" or "banknote"; null when the photos show neither.',
    `title: a short name for the coin or banknote type in ${languageNames[language]}, such as its denomination and year.`,
    "country: the issuing country as an ISO 3166-1 alpha-2 code.",
    'denomination: the face value and unit in English singular form, such as "1 krone", "2 euro" or "25 cents".',
    "series: the coin series or design name, or the banknote series, if it belongs to one.",
    "ruler: the monarch or ruler named or portrayed, if any.",
    "For coins only, null on banknotes: material, the metal or alloy, only when you can tell it with confidence; mintMark, as struck; diameter, in millimetres, only when it is clearly known for this coin type.",
    "For banknotes only, null on coins: serialNumber, signatures (the signatories' names) and printer, each as printed on the note.",
    "inscriptions: the legends and other text readable on either side.",
    `grade: the condition the photos show, on the scale the app grades this piece on: the Norwegian scale (${codes("norwegian")}) for coins and banknotes of Norway; Sheldon (1 to 70) for coins of the United States; the European scale (${codes("european")}) for other coins; the international scale (${codes("international")}) for other banknotes.`,
    "Judge the grade by wear, and on a banknote also by folds, creases, tears, holes and stains. Photos can hide wear and cleaning, so between two grades give the lower. Use null when the photos are too small, blurred or unevenly lit to judge.",
  ].join("\n");

const pickInstructions = [
  "You match a coin or banknote a collector photographed to an entry in the app's Catalog.",
  "You get what was read from the photos and the Catalog entries that might be this piece.",
  "Answer with the key of the entry that is exactly this coin or banknote type and issue, or null when none clearly is.",
].join("\n");

export function claudeVision({
  apiKey,
  model,
  fetch,
  timeout = 60_000,
  maxRetries = 1,
}: {
  apiKey: string;
  model: string;
  /** For tests: answers in place of Anthropic's servers. */
  fetch?: typeof globalThis.fetch;
  /** Milliseconds per request. */
  timeout?: number;
  maxRetries?: number;
}): ScanVision {
  const client = new Anthropic({ apiKey, fetch, timeout, maxRetries });

  /** The answer to one question, parsed from JSON; null when there's none. */
  async function ask(
    system: string,
    content: Anthropic.Beta.BetaContentBlockParam[],
    schema: Record<string, unknown>,
    effort: "low" | "medium",
  ): Promise<unknown> {
    try {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content }],
        output_config: { effort, format: { type: "json_schema", schema } },
        ...(modelsWithFallbacks.has(model) && {
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default" as const,
        }),
      });
      if (response.stop_reason !== "end_turn") {
        // Declined ("refusal", with a category in stop_details) or cut short.
        console.warn(
          `Scanner: no answer (${response.stop_reason})`,
          response.stop_details ?? "",
        );
        return null;
      }
      const answer = response.content.find((block) => block.type === "text");
      return answer?.type === "text" ? JSON.parse(answer.text) : null;
    } catch (failure) {
      if (failure instanceof SyntaxError) {
        console.warn("Scanner: the answer wasn't JSON");
      } else if (failure instanceof Anthropic.APIError) {
        console.error(
          `Scanner: the request failed (${failure.status ?? "no response"})`,
          failure.message,
        );
      } else {
        throw failure;
      }
      return null;
    }
  }

  return {
    async read({ front, back }, language) {
      const image = (photo: typeof front) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: photo.mediaType,
          data: photo.base64,
        },
      });
      const answer = await ask(
        readingInstructions(language),
        [
          { type: "text", text: "Front (obverse):" },
          image(front),
          { type: "text", text: "Back (reverse):" },
          image(back),
        ],
        readingSchema,
        "medium",
      );
      return readingFrom(answer);
    },

    async pick(reading: ScanReading, candidates: ScanCandidate[]) {
      // The Grade has no say in which entry it is.
      const { grade: _grade, ...read } = reading;
      const answer = await ask(
        pickInstructions,
        [
          {
            type: "text",
            text: `Read from the photos:\n${JSON.stringify(read)}\n\nCatalog entries:\n${candidates
              .map((candidate) => JSON.stringify(candidate))
              .join("\n")}`,
          },
        ],
        pickSchema,
        "low",
      );
      return pickFrom(answer);
    },
  };
}
