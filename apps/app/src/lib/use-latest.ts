"use client";

import { useState } from "react";

/**
 * The latest value that has arrived, kept on screen while the next one loads:
 * while a query with new arguments loads (`value` is undefined), `shown` is
 * still the previous result, so changing a search, a filter or a page doesn't
 * flash a skeleton. `loading` says the next one is on its way.
 */
export function useLatest<T>(value: T | undefined) {
  const [latest, setLatest] = useState(value);
  if (value !== undefined && value !== latest) setLatest(value);
  return { shown: value ?? latest, loading: value === undefined };
}
