import {
  defaultLocale,
  isLocale,
  locales,
  resolveLocale,
} from "@coinslite/i18n";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { createI18nMiddleware } from "next-international/middleware";
import type { NextRequest } from "next/server";

/** The language the user picked: kept for a year and sent on links from other sites. */
const LANGUAGE_COOKIE = "coinslite-language";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
/**
 * next-international's own cookie also stores languages it merely detected, and
 * only for the session. We ignore it so a detected language is never mistaken
 * for a choice; LANGUAGE_COOKIE holds the real preference.
 */
const LIBRARY_LOCALE_COOKIE = "Next-Locale";

const I18nMiddleware = createI18nMiddleware({
  locales: [...locales],
  defaultLocale,
  urlMappingStrategy: "rewrite",
  resolveLocaleFromRequest: (request) =>
    resolveLocale({
      stored: request.cookies.get(LANGUAGE_COOKIE)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    }),
});

function withLanguage(request: NextRequest) {
  // A language-prefixed path (e.g. /ro/login) means the user just picked it.
  const chosen = request.nextUrl.pathname.split("/")[1];
  request.cookies.delete(LIBRARY_LOCALE_COOKIE);
  const response = I18nMiddleware(request);
  if (isLocale(chosen)) {
    response.cookies.set(LANGUAGE_COOKIE, chosen, {
      maxAge: ONE_YEAR_IN_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

// Switching language navigates to e.g. /ro/login before the choice is stored.
const isSignInPage = createRouteMatcher([
  "/login",
  ...locales.map((locale) => `/${locale}/login`),
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();
  const isSignIn = isSignInPage(request);
  if (isSignIn && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  if (!isSignIn && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
  return withLanguage(request);
});

export const config = {
  matcher: [
    "/((?!_next/static|api|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",

    // all routes except static assets
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
