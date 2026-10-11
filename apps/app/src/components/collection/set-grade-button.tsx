"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type GradingScale,
  gradingScaleIds,
} from "@coinslite/backend/convex/items/grades";
import { Button } from "@coinslite/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useMutation } from "convex/react";
import { Award, Loader2, Ruler } from "lucide-react";
import { useState } from "react";
import type { ItemSelection } from "./use-item-selection";

/**
 * Select mode's Set Grade: pick a Grading scale and a Grade, then set it on
 * every selected Item the scale suits. Says how many were graded and skipped
 * through `onGraded`, failures through `onFailed`.
 */
export function SetGradeButton({
  selection,
  onGraded,
  onFailed,
}: {
  selection: ItemSelection;
  onGraded: (result: { graded: number; skipped: number }) => void;
  onFailed: (message: string) => void;
}) {
  const t = useI18n();
  const labels = useGradeLabels();
  const setGrade = useMutation(api.items.setGrade);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState<GradingScale>();
  const [grade, setGradeValue] = useState<string>();
  const [saving, setSaving] = useState(false);
  const { count, selected } = selection;

  const apply = async () => {
    if (!scale || !grade) return;
    setSaving(true);
    try {
      onGraded(
        await setGrade({
          itemIds: [...selected.keys()],
          gradingScale: scale,
          grade,
        }),
      );
      setOpen(false);
    } catch {
      onFailed(t("collection.gradeFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="xs" disabled={count === 0}>
          <Award aria-hidden="true" />
          {t("collection.setGrade")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("collection.setGrade")}
        align="end"
        className="flex w-64 flex-col gap-2 p-2"
      >
        <PropertyPicker
          icon={Ruler}
          label={t("items.gradingScale")}
          placeholder={t("items.gradingScale")}
          value={scale}
          options={gradingScaleIds.map((value) => ({
            value,
            label: labels.scale(value),
          }))}
          onChange={(value) => {
            setScale(value);
            setGradeValue(undefined);
          }}
          noResults={t("items.noMatches")}
        />
        {scale && (
          <PropertyPicker
            icon={Award}
            label={t("items.grade")}
            placeholder={t("items.setGrade")}
            value={grade}
            options={labels.gradeOptions(scale)}
            onChange={setGradeValue}
            noResults={t("items.noMatches")}
          />
        )}
        <Button
          type="button"
          size="xs"
          className="self-end"
          disabled={!scale || !grade || saving}
          onClick={() => void apply()}
        >
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t("collection.gradeApply", { count })}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
