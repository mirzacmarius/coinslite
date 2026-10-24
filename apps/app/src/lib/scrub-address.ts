import { shareLimits, sharePath } from "@coinslite/backend/convex/shares/rules";

/** A share link's token where it sits in a path: /s/<token>. */
const shareToken = new RegExp(
  `(${sharePath}/)[0-9a-f]{${shareLimits.tokenBytes * 2}}(?![0-9a-f])`,
  "g",
);

/**
 * Removes what an address may carry that names someone or opens something:
 * the query string and hash of every address in a text (sign-in codes,
 * email-confirmation tokens, admin searches), and the token of a share link,
 * which stands for its owner's say-so and is left as "/s/[token]", the way
 * usage statistics count the page (components/analytics.tsx).
 */
export function withoutSecrets(text: string) {
  return text
    .replace(/((?:https?:\/\/|\/)[^\s?#"']*)[?#][^\s"']*/g, "$1")
    .replace(shareToken, "$1[token]");
}
