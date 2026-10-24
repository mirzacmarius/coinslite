"use client";

import { TagList, useTagOptions } from "@/components/items/tag-picker";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2, Tag } from "lucide-react";
import { useState } from "react";
import type { ItemSelection } from "./use-item-selection";

/** Undoes a bulk tagging; says how many Items got their tags back and skipped. */
type UndoTag = () => Promise<FunctionReturnType<typeof api.items.undoTag>>;

/**
 * Select mode's Tag: add a tag to every selected Item, or take one off
 * them, picked from the person's tags or made from what's typed. Says the
 * tag as stored and how many were changed and skipped through `onTagged`,
 * with `undo` when any were changed, and failures through `onFailed`.
 */
export function TagItemsButton({
  selection,
  onTagged,
  onFailed,
}: {
  selection: ItemSelection;
  onTagged: (result: {
    tag: string;
    remove: boolean;
    changed: number;
    skipped: number;
    undo?: UndoTag;
  }) => void;
  onFailed: (message: string) => void;
}) {
  const t = useI18n();
  const tagMany = useMutation(api.items.tagMany);
  const undoTag = useMutation(api.items.undoTag);
  const { options } = useTagOptions();
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const { count, selected } = selection;

  const apply = async (picked: string) => {
    // One change at a time: a second pick while saving is ignored.
    if (saving) return;
    setSaving(true);
    try {
      const { tag, changed, skipped, before } = await tagMany({
        itemIds: [...selected.keys()],
        tag: picked,
        remove,
      });
      onTagged({
        tag,
        remove,
        changed,
        skipped,
        undo:
          before.length > 0
            ? () => undoTag({ before, tag, remove })
            : undefined,
      });
      setOpen(false);
    } catch {
      onFailed(t("collection.tagFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={count === 0 || saving}
        >
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Tag aria-hidden="true" />
          )}
          {t("collection.tag")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("collection.tag")}
        align="end"
        className="flex w-64 flex-col p-0"
      >
        <div className="border-b p-2">
          <SegmentedControl
            label={t("collection.tagMode")}
            value={remove ? "remove" : "add"}
            onChange={(mode) => setRemove(mode === "remove")}
            options={[
              { value: "add", label: t("collection.tagAdd") },
              { value: "remove", label: t("collection.tagRemove") },
            ]}
          />
        </div>
        <TagList
          options={options}
          onPick={(tag) => void apply(tag)}
          typedLabel={
            remove
              ? (tag) => t("collection.tagRemoveTyped", { tag })
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
