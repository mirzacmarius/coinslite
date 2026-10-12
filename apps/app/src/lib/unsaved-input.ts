"use client";

import { useEffect } from "react";

/** A form's hold on unsaved input; `released` once its input is saved or dismissed. */
type Hold = { released: boolean };

/** Forms that hold input nobody has saved yet; a reload would lose it. */
const unsaved = new Set<Hold>();
const listeners = new Set<() => void>();

export const hasUnsavedInput = () => unsaved.size > 0;

/** Calls `listener` whenever a form starts holding unsaved input, or its input is saved or dismissed. */
export function onUnsavedInputChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notifyListeners = () => {
  for (const listener of listeners) listener();
};

/** Marks a form as holding unsaved input; returns how to release it. */
export function registerUnsavedInput() {
  const hold: Hold = { released: false };
  unsaved.add(hold);
  notifyListeners();
  return () => {
    hold.released = true;
    unsaved.delete(hold);
    notifyListeners();
  };
}

/**
 * Lets go of every form's input, for leaving the page on purpose: after
 * signing in or out, what was typed is done with, so leaving doesn't ask.
 * Returns what to call if the page stays after all, so the forms hold their
 * input again.
 */
export function releaseAllUnsavedInput() {
  const held = [...unsaved];
  unsaved.clear();
  notifyListeners();
  return () => {
    for (const hold of held) if (!hold.released) unsaved.add(hold);
    notifyListeners();
  };
}

/** Marks a form as holding unsaved input while `changed` is true. */
export function useUnsavedInput(changed: boolean) {
  useEffect(() => {
    if (!changed) return;
    return registerUnsavedInput();
  }, [changed]);
}
