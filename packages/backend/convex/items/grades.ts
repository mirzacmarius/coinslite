/**
 * Grading scales and Strikes: static configuration shared by the backend
 * (which checks every write) and the app (which offers the choices).
 * Grades are stored as the codes below; labels people read are built from them
 * and, where a code has a meaning in words, translated in the app.
 */

import type { Locale } from "@coinslite/i18n";

export type ItemType = "coin" | "banknote" | "stamp";

/** The Sheldon grades in use, best first: 70 down to 1. */
const sheldonGrades = [
  70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 58, 55, 53, 50, 45, 40, 35, 30,
  25, 20, 15, 12, 10, 8, 6, 4, 3, 2, 1,
].map(String);

/** Each scale's Grades, best first, and the Item types it grades. */
export const gradingScales = {
  sheldon: { itemTypes: ["coin"], grades: sheldonGrades },
  norwegian: {
    itemTypes: ["coin", "banknote"],
    grades: ["0", "0/01", "01", "1+", "1", "1-", "2", "3"],
  },
  european: {
    itemTypes: ["coin"],
    grades: ["UNC", "XF", "VF", "F", "VG", "G"],
  },
  international: {
    itemTypes: ["banknote"],
    grades: ["UNC", "AU", "XF", "VF", "F", "VG", "G", "FR", "PR"],
  },
  stamp: { itemTypes: ["stamp"], grades: ["mnh", "mh", "used"] },
} as const satisfies Record<
  string,
  { itemTypes: readonly ItemType[]; grades: readonly string[] }
>;

export type GradingScale = keyof typeof gradingScales;
export const gradingScaleIds = Object.keys(gradingScales) as GradingScale[];

/** How a coin or banknote was made; independent of its Grade. */
export const strikes = ["circulation", "bu", "proof"] as const;
export type Strike = (typeof strikes)[number];

export const hasStrike = (type: ItemType) => type !== "stamp";

/** The scales that can grade an Item type. */
export const scalesFor = (type: ItemType) =>
  gradingScaleIds.filter((scale) =>
    (gradingScales[scale].itemTypes as readonly ItemType[]).includes(type),
  );

/**
 * The scale an Item starts on: Norway's own for Norwegian coins and banknotes,
 * Sheldon for American coins, otherwise European for coins and International
 * for banknotes.
 */
export function defaultScale(type: ItemType, country?: string): GradingScale {
  if (type === "stamp") return "stamp";
  if (country === "NO") return "norwegian";
  if (type === "coin") return country === "US" ? "sheldon" : "european";
  return "international";
}

export const isGrade = (scale: GradingScale, grade: string) =>
  (gradingScales[scale].grades as readonly string[]).includes(grade);

/** Whether an Item of this type can have this Grade: its scale suits the type. */
export const suitsGrade = (
  type: ItemType,
  scale: GradingScale,
  grade: string,
) => scalesFor(type).includes(scale) && isGrade(scale, grade);

/**
 * Where a Grade sits on its scale, from 0 (worst) to 1 (best), so Items on
 * different scales sort together. Sheldon is already numeric (1–70).
 */
export function gradeRank(scale: GradingScale, grade: string) {
  if (scale === "sheldon") return Number(grade) / 70;
  const grades = gradingScales[scale].grades as readonly string[];
  return 1 - grades.indexOf(grade) / (grades.length - 1);
}

/** The words behind a grade code; the app translates them. */
export type GradeMeaning =
  | "mintState"
  | "uncirculated"
  | "aboutUncirculated"
  | "extremelyFine"
  | "veryFine"
  | "fine"
  | "veryGood"
  | "good"
  | "aboutGood"
  | "fair"
  | "poor";

const meanings: Record<string, GradeMeaning> = {
  MS: "mintState",
  PF: "mintState",
  UNC: "uncirculated",
  AU: "aboutUncirculated",
  XF: "extremelyFine",
  EF: "extremelyFine",
  VF: "veryFine",
  F: "fine",
  VG: "veryGood",
  G: "good",
  AG: "aboutGood",
  FR: "fair",
  PO: "poor",
  PR: "poor",
};

/** Sheldon's word for a number, as in "VF-20"; proofs read "PF-65". */
function sheldonPrefix(grade: number, strike?: Strike) {
  if (grade >= 60) return strike === "proof" ? "PF" : "MS";
  if (grade >= 50) return "AU";
  if (grade >= 40) return "EF";
  if (grade >= 20) return "VF";
  if (grade >= 12) return "F";
  if (grade >= 8) return "VG";
  if (grade >= 4) return "G";
  return ["PO", "FR", "AG"][grade - 1] ?? "PO";
}

type EuropeanGrade = (typeof gradingScales.european.grades)[number];

/**
 * How German and French collectors write the European scale's Grades: "vz"
 * and "SUP" for XF, "ss" and "TTB" for VF. Those languages show them, with
 * the international code beside the meaning; the others write the codes.
 * UNC is "unz" in German, as the BU Strike is already Stempelglanz.
 */
export const localGradeCodes: Partial<
  Record<Locale, Record<EuropeanGrade, string>>
> = {
  de: { UNC: "unz", XF: "vz", VF: "ss", F: "s", VG: "sge", G: "ge" },
  fr: { UNC: "FDC", XF: "SUP", VF: "TTB", F: "TB", VG: "B", G: "AB" },
};

/** A Grade's own code in a language that writes it differently ("vz" for XF). */
export function localGradeCode(
  scale: GradingScale,
  grade: string,
  locale: Locale | undefined,
): string | undefined {
  if (scale !== "european" || locale === undefined) return undefined;
  return localGradeCodes[locale]?.[grade as EuropeanGrade];
}

/**
 * How a Grade is written: "MS-65", "XF", "1−", and in German or French the
 * European scale's own codes ("vz", "TTB") when `locale` is given. Stamp
 * grades are words and have no code to show, so they return undefined and
 * the app translates them.
 */
export function gradeCode(
  scale: GradingScale,
  grade: string,
  strike?: Strike,
  locale?: Locale,
): string | undefined {
  if (scale === "stamp") return undefined;
  if (scale === "sheldon")
    return `${sheldonPrefix(Number(grade), strike)}-${grade}`;
  const local = localGradeCode(scale, grade, locale);
  if (local) return local;
  // A true minus sign, as the Norwegian scale is printed.
  return grade.replace(/-$/, "−");
}

/** The meaning of a coded Grade, for a hint beside the code. */
export function gradeMeaning(
  scale: GradingScale,
  grade: string,
): GradeMeaning | undefined {
  if (scale === "norwegian" || scale === "stamp") return undefined;
  const prefix = scale === "sheldon" ? sheldonPrefix(Number(grade)) : grade;
  return meanings[prefix];
}
