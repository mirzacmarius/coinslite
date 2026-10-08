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

// The /design gallery shows the design system; it's public everywhere except production.
const isDesignGallery = createRouteMatcher([
  "/design",
  ...locales.map((locale) => `/${locale}/design`),
]);
const designGalleryIsPublic = process.env.VERCEL_ENV !== "production";

// Switching language navigates to e.g. /ro/login before the choice is stored.
const isSignInPage = createRouteMatcher([
  "/login",
  ...locales.map((locale) => `/${locale}/login`),
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (designGalleryIsPublic && isDesignGallery(request)) {
    return withLanguage(request);
  }
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
  // Everything except Next internals, files with an extension and the
  // generated app icons and manifest, plus /api, where Convex Auth handles
  // sign-in requests.
  matcher: [
    "/((?!_next/static|_next/image|api|icon|apple-icon|manifest.webmanifest|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
