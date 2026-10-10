import { getDictionary } from "@/i18n/dictionary";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { Logo } from "@coinslite/ui/logo";
import { cacheLife } from "next/cache";

/** The current year, cached for a day so the prerendered page can carry it. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).footer;
  const year = await copyrightYear();
  const link = "rounded-md hover:text-foreground";
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <span className="flex items-center gap-2">
          <Logo className="text-[13px] text-foreground" />
          <span>© {year}</span>
        </span>
        <nav className="flex gap-4 sm:ml-auto">
          <a href={localePath(locale, "/privacy")} className={link}>
            {t.privacy}
          </a>
          <a href={localePath(locale, "/terms")} className={link}>
            {t.terms}
          </a>
        </nav>
      </div>
    </footer>
  );
}
