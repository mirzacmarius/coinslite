import "@coinslite/ui/globals.css";
import { brand } from "@/lib/brand";
import { I18nProvider } from "@/locales/client";
import { loaders } from "@/locales/loaders";
import { getI18n } from "@/locales/server";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import { Toaster } from "@coinslite/ui/toaster";
import { TooltipProvider } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "../convex-client-provider";

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
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} suppressHydrationWarning>
        <body
          className={cn(
            `${GeistSans.variable} ${GeistMono.variable}`,
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
              <ConvexClientProvider>
                <I18nProvider locale={locale} dictionary={dictionary}>
                  {children}
                </I18nProvider>
              </ConvexClientProvider>
            </TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
