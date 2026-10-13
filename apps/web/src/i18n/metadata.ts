import { getDictionary } from "./dictionary";
import { format } from "./format";
import { localePath } from "./routing";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { type Locale, locales } from "@coinslite/i18n";
import type { Metadata } from "next";

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
  // The language's social preview ([locale]/opengraph-image.tsx), named here
  // so the pages under it keep it: their own openGraph replaces the parent's.
  const images = [
    {
      url: `${localePath(locale)}/opengraph-image/card`,
      width: 1200,
      height: 630,
      alt: t.imageAlt,
    },
  ];
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
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
