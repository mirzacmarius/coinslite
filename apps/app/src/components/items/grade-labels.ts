import { useCurrentLocale, useI18n } from "@/locales/client";
import {
  type GradingScale,
  type ItemType,
  type Strike,
  gradeCode,
  gradeMeaning,
  gradingScales,
  localGradeCode,
  scalesFor,
  strikes,
} from "@coinslite/backend/convex/items/grades";
import { useMemo } from "react";

type StampGrade = (typeof gradingScales.stamp.grades)[number];

/**
 * Grades, Grading scales and Strikes as people read them, in the current
 * language: in German and French the European scale's own codes ("vz",
 * "TTB"), the international code then following the meaning ("Vorzüglich
 * (XF)").
 */
export function useGradeLabels() {
  const t = useI18n();
  const locale = useCurrentLocale();
  return useMemo(() => {
    const grade = (scale: GradingScale, value: string, strike?: Strike) =>
      gradeCode(scale, value, strike, locale) ??
      t(`grades.stamp.${value as StampGrade}`);
    const meaning = (scale: GradingScale, value: string) => {
      const words = gradeMeaning(scale, value);
      const said = words && t(`grades.meanings.${words}`);
      return said && localGradeCode(scale, value, locale)
        ? `${said} (${value})`
        : said;
    };
    const scale = (value: GradingScale) => t(`grades.scales.${value}`);
    const strike = (value: Strike) => t(`grades.strikes.${value}`);
    return {
      grade,
      meaning,
      scale,
      strike,
      gradeOptions: (on: GradingScale, struck?: Strike) =>
        gradingScales[on].grades.map((value: string) => ({
          value,
          label: grade(on, value, struck),
          hint: meaning(on, value),
        })),
      scaleOptions: (type: ItemType) =>
        scalesFor(type).map((value) => ({ value, label: scale(value) })),
      strikeOptions: () =>
        strikes.map((value) => ({ value, label: strike(value) })),
    };
  }, [t, locale]);
}
