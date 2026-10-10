import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { type Locale, locales } from "@coinslite/i18n";
import type { Metadata } from "next";
import { getDictionary } from "./dictionary";
import { format } from "./format";
import { localePath } from "./routing";

/**
 * A page's title and description in one language, with links to the same
 * page in the other four and the language's own social preview.
 */
export function pageMetadata(
  locale: Locale,
  path: string,
  page?: { title: string; description: string },
): Metadata {
  const t = getDictionary(locale).meta;
  const title = page ? `${page.title} · CoinsLite` : t.title;
  const description =
    page?.description ?? format(t.description, { limit: freePlan.itemLimit });
  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, path),
      languages: Object.fromEntries(
        locales.map((value) => [value, localePath(value, path)]),
      ),
    },
    openGraph: {
      title,
      description,
      siteName: "CoinsLite",
      locale,
      type: "website",
      url: localePath(locale, path),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
