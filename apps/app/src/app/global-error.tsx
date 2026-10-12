"use client";

import "@coinslite/ui/globals.css";
import { errorScreenLocale } from "@/lib/error-screen-locale";
import { globalErrorTexts } from "@/locales/global-error";
import { Button } from "@coinslite/ui/button";
import { Logo } from "@coinslite/ui/logo";
import * as Sentry from "@sentry/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Shown in place of the whole app when it fails outside a page (its root
 * layout, or the frame around the pages), in the language the page was in.
 * It reports the error and offers a reload, laid out like the not-found
 * screen. It brings its own styles: the root layout is gone.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const urlLocale = useParams()?.locale;
  // Cookies are only readable in the browser; until hydration, render as the server did.
  const cookies = useSyncExternalStore(
    subscribe,
    () => document.cookie,
    () => undefined,
  );
  const locale = errorScreenLocale({ urlLocale, cookies });
  const t = globalErrorTexts[locale];
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang={locale}>
      <body className="bg-background text-foreground antialiased [font-family:ui-sans-serif,system-ui,sans-serif]">
        <title>{t.title}</title>
        <div className="flex min-h-dvh flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <div className="flex h-12 items-center px-4 pt-[env(safe-area-inset-top)]">
            <Logo className="text-[13px]" />
          </div>
          <main className="flex flex-1 justify-center px-4 pb-16 pt-[10dvh]">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <div className="flex flex-col gap-1">
                <h1 className="text-[15px] font-medium">{t.title}</h1>
                <p className="text-[13px] text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t.reload}
              </Button>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
