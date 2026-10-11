import { defaultLocale, locales, resolveLocale } from "@coinslite/i18n";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { LANGUAGE_COOKIE, ONE_YEAR_IN_SECONDS } from "./lib/language-cookie";
import { languageFromLink } from "./lib/language-link";
import { safeNextPath } from "./lib/next-path";
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

/**
 * Serves the page in the stored language, else the browser's. Only reads the
 * choice: the language menu stores it when someone picks one, because a
 * language-prefixed path (/ro/login) can also be Next's own rewrite of a page.
 */
function withLanguage(request: NextRequest) {
  request.cookies.delete(LIBRARY_LOCALE_COOKIE);
  return I18nMiddleware(request);
}

/** A page path plus its language-prefixed forms, e.g. /login and /ro/login. */
const inEveryLanguage = (paths: string[]) =>
  paths.flatMap((path) => [
    path,
    ...locales.map((locale) => `/${locale}${path}`),
  ]);

// Open tabs ask which deployment is live; signed in or not, in any language.
const isVersionCheck = createRouteMatcher(["/api/version"]);

// Signing in, signing up and the emailed links; signed-in visitors are sent on.
const isSignInPage = createRouteMatcher(
  inEveryLanguage(["/login", "/signup", "/verify", "/link"]),
);
// Links from emails (password reset, email change) work signed in or not.
const isOpenPage = createRouteMatcher(
  inEveryLanguage(["/reset", "/confirm-email"]),
);

/**
 * Tells the marketing site someone is signed in, so it can send them straight
 * to the app. Only shared when both sites sit under SIGNED_IN_HINT_DOMAIN
 * (e.g. ".coinslite.app"); locally, cookies are shared across ports anyway.
 * apps/web/src/proxy.ts reads the same name.
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
  if (isOpenPage(request)) {
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

/**
 * A link from the marketing site names the language its visitor was reading
 * (/signup?lang=de). Opening it is choosing that language, so it's stored as
 * the language menu would, and the page opens in it without the parameter.
 */
function withLanguageFromLink(request: NextRequest) {
  const fromLink = languageFromLink(request.nextUrl);
  if (!fromLink) return null;
  const response = redirect(request, fromLink.path);
  if (fromLink.locale) {
    response.cookies.set(LANGUAGE_COOKIE, fromLink.locale, {
      path: "/",
      sameSite: "lax",
      maxAge: ONE_YEAR_IN_SECONDS,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const proxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const linked = withLanguageFromLink(request);
    if (linked) return linked;
    if (isVersionCheck(request)) {
      return NextResponse.next();
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
