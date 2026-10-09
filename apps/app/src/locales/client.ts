"use client";

import type { Locale } from "@coinslite/i18n";
import { createI18nClient } from "next-international/client";
import {
  type ContextType,
  type ReactNode,
  createElement,
  useMemo,
} from "react";
import { loaders } from "./loaders";
import type { Dictionary } from "./types";

export const {
  useI18n,
  useScopedI18n,
  useChangeLocale,
  useCurrentLocale,
  I18nClientContext,
} = createI18nClient(loaders);

type FlatDictionary = Record<string, string>;

/** { auth: { title: "…" } } → { "auth.title": "…" }, the shape the translate functions read. */
function flatten(
  dictionary: object,
  prefix = "",
  flat: FlatDictionary = {},
): FlatDictionary {
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string") flat[prefix + key] = value;
    else flatten(value, `${prefix}${key}.`, flat);
  }
  return flat;
}

/**
 * Gives client components the dictionary the server already loaded. The
 * library's own provider imports it again in the browser and suspends while it
 * does, which makes React 19 throw away the server-rendered page on hydration
 * (and with it, keyboard focus).
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(
    () =>
      ({ locale, localeContent: flatten(dictionary) }) as ContextType<
        typeof I18nClientContext
      >,
    [locale, dictionary],
  );
  return createElement(I18nClientContext.Provider, { value }, children);
}
