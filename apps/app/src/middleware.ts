import { defaultLocale, locales, resolveLocale } from "@coinslite/i18n";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { createI18nMiddleware } from "next-international/middleware";

// The library keeps the chosen language in its `Next-Locale` cookie and only
// asks us when there's none yet: then the browser's languages decide.
const I18nMiddleware = createI18nMiddleware({
  locales: [...locales],
  defaultLocale,
  urlMappingStrategy: "rewrite",
  resolveLocaleFromRequest: (request) =>
    resolveLocale({ acceptLanguage: request.headers.get("accept-language") }),
});

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
  return I18nMiddleware(request);
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
