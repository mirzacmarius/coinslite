import { getDictionary } from "@/i18n/dictionary";
import { appLink } from "@/i18n/links";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { buttonVariants } from "@coinslite/ui/button";
import { Logo } from "@coinslite/ui/logo";
import { LanguageSwitcher } from "./language-switcher";

/** The bar on every page: home, the sections, the language and the way into the app. */
export function SiteHeader({
  locale,
  path,
}: {
  locale: Locale;
  /** This page without its language, so the switcher can open it in another. */
  path: string;
}) {
  const t = getDictionary(locale).header;
  const home = localePath(locale);
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:px-6">
        <a href={home} aria-label={t.home} className="mr-4 rounded-md text-sm">
          <Logo />
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href={`${home}#features`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t.features}
          </a>
          <a
            href={`${home}#plans`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t.plans}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher locale={locale} path={path} label={t.language} />
          <a
            href={appLink(locale, "/login")}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t.signIn}
          </a>
          <a
            href={appLink(locale, "/signup")}
            className={buttonVariants({
              size: "sm",
              className: "hidden sm:inline-flex",
            })}
          >
            {t.createAccount}
          </a>
        </div>
      </div>
    </header>
  );
}
