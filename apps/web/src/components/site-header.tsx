import { getDictionary } from "@/i18n/dictionary";
import { appLink } from "@/i18n/links";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { Logo } from "@coinslite/ui/logo";
import { cn } from "@coinslite/ui/utils";
import { outlinedAction, smallCapsLink } from "./actions";
import { LanguageSwitcher } from "./language-switcher";

/**
 * The bar on every page, floating clear of the edges: home, the sections,
 * the language and the way into the app. On the home page it lies over the
 * opening screen (`overlay`); elsewhere it keeps its place above the page.
 */
export function SiteHeader({
  locale,
  path,
  overlay = false,
}: {
  locale: Locale;
  /** This page without its language, so the switcher can open it in another. */
  path: string;
  overlay?: boolean;
}) {
  const t = getDictionary(locale).header;
  const home = localePath(locale);
  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-30 p-3 sm:p-4",
        overlay ? "fixed" : "sticky",
      )}
    >
      <div className="flex h-16 items-center gap-2 border border-foreground/10 bg-background/70 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/55 sm:px-6">
        <a
          href={home}
          aria-label={t.home}
          className="mr-auto focus-visible:outline-none md:mr-6 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo className="text-[15px] font-medium tracking-[-0.02em]" />
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          <a href={`${home}#features`} className={smallCapsLink}>
            {t.features}
          </a>
          <a href={`${home}#plans`} className={smallCapsLink}>
            {t.plans}
          </a>
        </nav>
        <div className="flex items-center gap-1 sm:ml-auto sm:gap-5">
          <LanguageSwitcher locale={locale} path={path} label={t.language} />
          <a
            href={appLink(locale, "/login")}
            className={cn(smallCapsLink, "hidden sm:inline-flex")}
          >
            {t.signIn}
          </a>
          <a
            href={appLink(locale, "/signup")}
            className={cn(
              outlinedAction,
              // The narrowest phones reach it from the page's own buttons.
              "h-10 whitespace-nowrap px-3 tracking-[0.08em] max-[359px]:hidden sm:px-6 sm:tracking-[0.16em]",
            )}
          >
            {t.createAccount}
          </a>
        </div>
      </div>
    </header>
  );
}
