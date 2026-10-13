import { localePath } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";
import { locales } from "@coinslite/i18n";
import type { MetadataRoute } from "next";

const PAGES = ["/", "/privacy", "/terms"];

/** Every page in every language, each listing its translations. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}${localePath(locale, path)}`,
      alternates: {
        languages: Object.fromEntries(
          locales.map((other) => [other, `${base}${localePath(other, path)}`]),
        ),
      },
    })),
  );
}
