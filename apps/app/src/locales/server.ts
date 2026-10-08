import { createI18nServer } from "next-international/server";

export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } =
  createI18nServer({
    en: () => import("./en"),
    nb: () => import("./nb"),
    de: () => import("./de"),
    fr: () => import("./fr"),
    ro: () => import("./ro"),
  });
