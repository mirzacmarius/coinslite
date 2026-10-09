"use client";

import { useEffect } from "react";

/** Forms that hold input nobody has saved yet; a reload would lose it. */
const unsaved = new Set<symbol>();
const listeners = new Set<() => void>();

export const hasUnsavedInput = () => unsaved.size > 0;

/** Calls `listener` whenever a form's input is saved or dismissed. */
export function onUnsavedInputChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks a form as holding unsaved input while `isDirty` is true. */
export function useUnsavedInput(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const form = Symbol("unsaved form");
    unsaved.add(form);
    return () => {
      unsaved.delete(form);
      for (const listener of listeners) listener();
    };
  }, [isDirty]);
}
