"use client";

import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { bulkLimits } from "@coinslite/backend/convex/items/bulkRules";
import { useCallback, useRef, useState } from "react";

/** A selected Item, with the Album it's in now. */
export type SelectableItem = {
  _id: Id<"items">;
  albumId?: Id<"albums"> | null;
};

/**
 * Which Items in the Collection are selected, while select mode is on. Page
 * state, not URL state: a selection is a moment's work. At most
 * `bulkLimits.items` Items can be selected, as many as one action takes.
 */
export function useItemSelection() {
  const [selecting, setSelecting] = useState(false);
  const [selected, setState] = useState(
    () => new Map<Id<"items">, Id<"albums"> | null>(),
  );
  // The selection as last set, so each change builds on the one before even
  // within one event, and can tell what didn't fit.
  const latest = useRef(selected);
  const setSelected = useCallback(
    (next: Map<Id<"items">, Id<"albums"> | null>) => {
      latest.current = next;
      setState(next);
    },
    [],
  );
  // Where a shift-click range starts: the Item last clicked.
  const anchor = useRef<Id<"items"> | null>(null);

  /** Adds Items to the selection, up to the limit; how many didn't fit. */
  const add = useCallback(
    (items: readonly SelectableItem[]) => {
      const next = new Map(latest.current);
      let leftOut = 0;
      for (const item of items) {
        if (next.has(item._id)) continue;
        if (next.size >= bulkLimits.items) {
          leftOut += 1;
          continue;
        }
        next.set(item._id, item.albumId ?? null);
      }
      setSelected(next);
      return leftOut;
    },
    [setSelected],
  );

  /**
   * Selects or unselects one Item; with `range`, selects every Item on the
   * page from the last one clicked to this one.
   */
  const toggle = useCallback(
    (item: SelectableItem, page: readonly SelectableItem[], range: boolean) => {
      const from = page.findIndex(({ _id }) => _id === anchor.current);
      const to = page.findIndex(({ _id }) => _id === item._id);
      anchor.current = item._id;
      if (range && from !== -1 && to !== -1) {
        add(page.slice(Math.min(from, to), Math.max(from, to) + 1));
        return;
      }
      const next = new Map(latest.current);
      if (next.has(item._id)) next.delete(item._id);
      else if (next.size < bulkLimits.items)
        next.set(item._id, item.albumId ?? null);
      setSelected(next);
    },
    [add, setSelected],
  );

  const clear = useCallback(() => {
    anchor.current = null;
    setSelected(new Map());
  }, [setSelected]);

  const start = useCallback(() => setSelecting(true), []);
  const stop = useCallback(() => {
    clear();
    setSelecting(false);
  }, [clear]);

  return {
    selecting,
    selected,
    count: selected.size,
    isSelected: (itemId: Id<"items">) => selected.has(itemId),
    toggle,
    add,
    clear,
    start,
    stop,
  };
}

export type ItemSelection = ReturnType<typeof useItemSelection>;
