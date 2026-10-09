/**
 * The words of a Catalog search, on both sides: what a node is found by
 * (`searchText`) and what someone typed. Pure, so the app can tell when a
 * search starts.
 */

export const catalogSearchLimits = {
  /** A search starts once this many characters are typed. */
  minLength: 2,
  /** Results per search; more ask the user to refine it. */
  results: 50,
  /** Words that count; a search index takes at most 16 terms. */
  words: 16,
} as const;

/** Letters that don't decompose into a base letter and an accent. */
const foldedLetters: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ł: "l",
  đ: "d",
};

/**
 * The words in a text, lowercased and without accents ("États-Unis" gives
 * "etats" and "unis"), each once.
 */
export function searchWords(text: string): string[] {
  const folded = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[øæœßłđ]/g, (letter) => foldedLetters[letter] ?? letter);
  return [...new Set(folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean))];
}

/** The words a search for `text` looks for, or none when it is too short to start. */
export function searchQueryWords(text: string): string[] {
  const words = searchWords(text).slice(0, catalogSearchLimits.words);
  return words.join(" ").length < catalogSearchLimits.minLength ? [] : words;
}

/** Whether every searched word starts one of the words in `searchText`. */
export function matchesEveryWord(words: string[], searchText: string) {
  const found = searchText.split(" ");
  return words.every((word) => found.some((each) => each.startsWith(word)));
}
