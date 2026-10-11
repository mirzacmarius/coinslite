import "@coinslite/ui/globals.css";
import { NewDeploymentReload } from "@/components/new-deployment-reload";
import { ThemeProvider } from "@/components/theme-provider";
import { brand } from "@/lib/brand";
import { I18nProvider } from "@/locales/client";
import { loaders } from "@/locales/loaders";
import { getI18n, getStaticParams } from "@/locales/server";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import { Toaster } from "@coinslite/ui/toaster";
import { TooltipProvider } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { Suspense } from "react";
import { ConvexClientProvider } from "../convex-client-provider";

// Latin Extended covers Norwegian, German, French and Romanian.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

/** Every language is prerendered, so each page has a static shell to serve. */
export function generateStaticParams() {
  return getStaticParams();
}

export async function generateMetadata() {
  const t = await getI18n();
  return { title: "CoinsLite", description: t("common.appDescription") };
}

export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.lightBackground },
    { media: "(prefers-color-scheme: dark)", color: brand.darkBackground },
  ],
};

/**
 * The session is read from cookies and stamped with the current time, so it is
 * rendered per request, never into a prerendered shell. On a page load it
 * streams in after the static frame; moving between pages never re-renders it.
 */
async function Session({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const requested = (await params).locale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const dictionary = (await loaders[locale]()).default;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          `${inter.variable} ${GeistMono.variable}`,
          "font-sans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            <I18nProvider locale={locale} dictionary={dictionary}>
              <Suspense>
                <Session>{children}</Session>
              </Suspense>
            </I18nProvider>
          </TooltipProvider>
          <Toaster />
          <NewDeploymentReload />
        </ThemeProvider>
      </body>
    </html>
  );
}
