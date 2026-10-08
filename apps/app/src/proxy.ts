import {
  defaultLocale,
  isLocale,
  locales,
  resolveLocale,
} from "@coinslite/i18n";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "./lib/next-path";

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

/** A page path plus its language-prefixed forms, e.g. /login and /ro/login. */
const inEveryLanguage = (paths: string[]) =>
  paths.flatMap((path) => [
    path,
    ...locales.map((locale) => `/${locale}${path}`),
  ]);

// Signing in, signing up and the verify link; signed-in visitors are sent on.
const isSignInPage = createRouteMatcher(
  inEveryLanguage(["/login", "/signup", "/verify"]),
);
// The reset link works whether or not someone is signed in.
const isPasswordResetPage = createRouteMatcher(inEveryLanguage(["/reset"]));

/**
 * Tells the marketing site someone is signed in, so it can send them straight
 * to the app. Only shared when both sites sit under SIGNED_IN_HINT_DOMAIN
 * (e.g. ".coinslite.app"); locally, cookies are shared across ports anyway.
 * The marketing site reads the same name.
 */
const SIGNED_IN_HINT_COOKIE = "coinslite-signed-in";

function withSignedInHint(
  request: NextRequest,
  response: NextResponse,
  isAuthenticated: boolean,
) {
  const domain = process.env.SIGNED_IN_HINT_DOMAIN || undefined;
  if (isAuthenticated) {
    response.cookies.set(SIGNED_IN_HINT_COOKIE, "1", {
      domain,
      path: "/",
      sameSite: "lax",
      maxAge: ONE_YEAR_IN_SECONDS,
    });
  } else if (request.cookies.has(SIGNED_IN_HINT_COOKIE)) {
    response.cookies.set(SIGNED_IN_HINT_COOKIE, "", {
      domain,
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

const redirect = (request: NextRequest, pathAndQuery: string) =>
  NextResponse.redirect(new URL(pathAndQuery, request.url));

function route(request: NextRequest, isAuthenticated: boolean) {
  if (isPasswordResetPage(request)) {
    return withLanguage(request);
  }
  if (isSignInPage(request)) {
    return isAuthenticated
      ? redirect(
          request,
          safeNextPath(request.nextUrl.searchParams.get("next")),
        )
      : withLanguage(request);
  }
  if (!isAuthenticated) {
    // Come back to the page that was asked for once signed in.
    const { pathname, search } = request.nextUrl;
    const back = pathname + search;
    return redirect(
      request,
      back === "/" ? "/login" : `/login?next=${encodeURIComponent(back)}`,
    );
  }
  return withLanguage(request);
}

export const proxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (designGalleryIsPublic && isDesignGallery(request)) {
      return withLanguage(request);
    }
    const isAuthenticated = await convexAuth.isAuthenticated();
    return withSignedInHint(
      request,
      route(request, isAuthenticated),
      isAuthenticated,
    );
  },
  { convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL },
);

export const config = {
  // Everything except Next internals, files with an extension (such as the
  // manifest) and the generated app icons, plus /api, where Convex Auth handles
  // sign-in requests.
  matcher: [
    "/((?!_next/static|_next/image|api|icon|apple-icon|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
