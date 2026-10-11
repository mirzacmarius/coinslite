import type { GradingScale } from "./grades";

/**
 * The facts that identify a piece outside CoinsLite: the Certification of a
 * slabbed coin or banknote, and a stamp's number in a stamp catalogue. Pure,
 * so the app and the exports name them the same way.
 */

/** The grading services a coin or banknote can be certified by. */
export const graders = ["pcgs", "ngc", "anacs", "icg", "pmg", "other"] as const;
export type Grader = (typeof graders)[number];

/** The stamp catalogues a stamp's number can come from. */
export const stampCatalogues = [
  "michel",
  "scott",
  "stanleyGibbons",
  "yvert",
  "afa",
  "norgeskatalogen",
  "other",
] as const;
export type StampCatalogue = (typeof stampCatalogues)[number];

/** Graders and catalogues go by their own names in every language; "other" is translated. */
export const graderNames: Record<Exclude<Grader, "other">, string> = {
  pcgs: "PCGS",
  ngc: "NGC",
  anacs: "ANACS",
  icg: "ICG",
  pmg: "PMG",
};
export const stampCatalogueNames: Record<
  Exclude<StampCatalogue, "other">,
  string
> = {
  michel: "Michel",
  scott: "Scott",
  stanleyGibbons: "Stanley Gibbons",
  yvert: "Yvert et Tellier",
  afa: "AFA",
  norgeskatalogen: "Norgeskatalogen",
};

/**
 * A grader's or catalogue's name as written: its own, the name typed for
 * "other", or `other` (the reader's word) when none was typed.
 */
export function referenceName<K extends string>(
  names: Record<Exclude<K, "other">, string>,
  chosen: K,
  typed: string | undefined,
  other: string,
) {
  return chosen === "other"
    ? typed ?? other
    : names[chosen as Exclude<K, "other">];
}

/**
 * The grader's page that verifies a certificate, for the graders that have
 * one. NGC's lookup also takes the grade, which only a coin on the Sheldon
 * scale has in NGC's numbers; PMG's banknotes never do, so theirs is the
 * certificate alone.
 */
export function certificateUrl(
  grader: Grader,
  certificateNumber: string,
  grade?: { scale: GradingScale; grade: string },
) {
  const cert = encodeURIComponent(certificateNumber.trim());
  const sheldon = grade?.scale === "sheldon" ? `${grade.grade}/` : "";
  switch (grader) {
    case "pcgs":
      return `https://auth.pcgs.com/cert/${cert}`;
    case "ngc":
      return `https://www.ngccoin.com/certlookup/${cert}/${sheldon}`;
    case "pmg":
      return `https://www.pmgnotes.com/certlookup/${cert}/${sheldon}`;
    default:
      return undefined;
  }
}
