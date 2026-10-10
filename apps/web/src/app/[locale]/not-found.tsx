import { NotFoundPage } from "@/components/not-found-page";
import { getDictionary } from "@/i18n/dictionary";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import type { Metadata } from "next";
import { locale as localeParam } from "next/root-params";

async function currentLocale() {
  const value: unknown = await localeParam();
  return isLocale(value) ? value : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await currentLocale()).notFound;
  return { title: `${t.title} · CoinsLite` };
}

/** For a page that finds nothing to show, in the language its path names. */
export default async function NotFound() {
  return <NotFoundPage locale={await currentLocale()} />;
}
