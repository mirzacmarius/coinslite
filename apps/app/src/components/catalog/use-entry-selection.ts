"use client";

import { setLimits } from "@coinslite/backend/convex/catalog/setRules";
import { useState } from "react";

/** A Catalog entry as selection sees it: its key and how many of it the person holds. */
export type SelectableEntry = { key: string; held: number };

/**
 * Selecting several Catalog entries to add at once (spec 6.2). Entries the
 * person already holds can't be selected unless they allow a duplicate; turning
 * that off again leaves them out of what's added. At most `setLimits.bulkAdd`
 * are added at a time.
 */
export function useEntrySelection() {
  // How many each selected entry held when it was selected.
  const [selected, setSelected] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const canSelect = (held: number) => allowDuplicates || held === 0;

  return {
    allowDuplicates,
    setAllowDuplicates,
    /** Whether an entry holding `held` may be selected now. */
    canSelect,
    isSelected: (key: string) => selected.has(key),
    /** The selected entries' keys, in the order selected, leaving out held ones unless duplicates are allowed. */
    keys: [...selected]
      .filter(([, held]) => canSelect(held))
      .map(([key]) => key),
    toggle: ({ key, held }: SelectableEntry) =>
      setSelected((current) => {
        const next = new Map(current);
        if (next.has(key)) next.delete(key);
        else if (canSelect(held)) next.set(key, held);
        return next;
      }),
    /**
     * Adds entries to the selection, as far as one add takes; returns how
     * many didn't fit.
     */
    selectMany: (entries: SelectableEntry[]) => {
      const next = new Map(selected);
      let leftOut = 0;
      for (const { key, held } of entries) {
        if (next.has(key) || !canSelect(held)) continue;
        if (next.size >= setLimits.bulkAdd) leftOut++;
        else next.set(key, held);
      }
      setSelected(next);
      return leftOut;
    },
    clear: () => setSelected(new Map()),
  };
}

export type EntrySelection = ReturnType<typeof useEntrySelection>;
