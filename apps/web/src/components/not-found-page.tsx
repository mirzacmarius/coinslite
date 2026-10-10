import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/dictionary";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { SearchX } from "lucide-react";
import Link from "next/link";

/** An address nothing answers: one calm column, as in the app. */
export function NotFoundPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).notFound;
  return (
    <>
      <SiteHeader locale={locale} path="/" />
      <main
        id="main"
        className="flex flex-1 justify-center px-4 pb-24 pt-[14dvh]"
      >
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground">
            <SearchX className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[15px] font-medium">{t.title}</h1>
            <p className="text-[13px] text-muted-foreground">{t.description}</p>
          </div>
          <Link
            href={localePath(locale)}
            className="rounded-md text-[13px] font-medium text-primary hover:underline"
          >
            {t.home}
          </Link>
        </div>
      </main>
    </>
  );
}
