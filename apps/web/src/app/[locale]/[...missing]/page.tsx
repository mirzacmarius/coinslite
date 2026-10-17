import { NotFoundPage } from "@/components/not-found-page";
import { getDictionary } from "@/i18n/dictionary";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import type { Metadata } from "next";
import { locale as localeParam } from "next/root-params";

/**
 * Only the language is read, not the rest of the address, so the page is
 * prerendered whole for each language.
 */
async function currentLocale() {
  const value: unknown = await localeParam();
  return isLocale(value) ? value : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await currentLocale()).notFound;
  return { title: `${t.title} · CoinsLite`, robots: { index: false } };
}

/**
 * The site must stay static (ensureStatic), which needs one address to
 * prerender; any other is rendered once, on its first visit, then kept.
 */
export function generateStaticParams() {
  return [{ missing: ["not-found"] }];
}

/** Any other address in a language: the not-found page, in that language. */
export default async function Missing() {
  return <NotFoundPage locale={await currentLocale()} />;
}
