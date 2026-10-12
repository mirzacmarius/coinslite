"use client";

import { useEffect } from "react";

/** Forms that hold input nobody has saved yet; a reload would lose it. */
const unsaved = new Set<symbol>();
const listeners = new Set<() => void>();

export const hasUnsavedInput = () => unsaved.size > 0;

/** Calls `listener` whenever a form starts holding unsaved input, or its input is saved or dismissed. */
export function onUnsavedInputChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const changed = () => {
  for (const listener of listeners) listener();
};

/** Marks a form as holding unsaved input; returns how to release it. */
export function registerUnsavedInput() {
  const form = Symbol("unsaved form");
  unsaved.add(form);
  changed();
  return () => {
    unsaved.delete(form);
    changed();
  };
}

/**
 * Lets go of every form's input, for leaving the page on purpose: after
 * signing in or out, what was typed is done with, so leaving doesn't ask.
 */
export function releaseAllUnsavedInput() {
  unsaved.clear();
  changed();
}

/** Marks a form as holding unsaved input while `isDirty` is true. */
export function useUnsavedInput(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    return registerUnsavedInput();
  }, [isDirty]);
}
