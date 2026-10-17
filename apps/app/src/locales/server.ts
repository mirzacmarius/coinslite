import { defaultLocale, isLocale } from "@coinslite/i18n";
import {
  createI18nServer,
  setStaticParamsLocale,
} from "next-international/server";
import { locale as localeParam } from "next/root-params";
import { loaders } from "./loaders";

const server = createI18nServer(loaders);

/**
 * The language comes from the URL's [locale] (the proxy rewrites every page
 * there), not from the request's headers, so a route's prefetched shell is
 * static: one per language, served without rendering on the server.
 */
async function setLocaleFromUrl() {
  const requested: unknown = await localeParam();
  setStaticParamsLocale(isLocale(requested) ? requested : defaultLocale);
}

export const getI18n: typeof server.getI18n = async () => {
  await setLocaleFromUrl();
  return server.getI18n();
};

export async function getScopedI18n<
  Scope extends Parameters<typeof server.getScopedI18n>[0],
>(scope: Scope) {
  await setLocaleFromUrl();
  return server.getScopedI18n(scope);
}

export const getCurrentLocale: typeof server.getCurrentLocale = async () => {
  await setLocaleFromUrl();
  return server.getCurrentLocale();
};

export const { getStaticParams } = server;
