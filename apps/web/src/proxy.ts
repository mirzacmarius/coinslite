import { env } from "@/env";
import { LANGUAGE_COOKIE, languageRedirect, localeOf } from "@/i18n/routing";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Set by the product app while someone is signed in; the name is shared with
 * apps/app/src/proxy.ts. It reaches this site when both share a parent domain,
 * or on localhost.
 */
const SIGNED_IN_HINT_COOKIE = "coinslite-signed-in";

/** The home page, with or without its language: "/", "/de". */
const isHomePage = (pathname: string) =>
  pathname === "/" || pathname === `/${localeOf(pathname)}`;

/**
 * Signed-in visitors skip the home page and go straight to their Collection.
 * Everyone else gets every page in a language: a path without one (such as
 * the old /privacy and /terms) goes to the same page in the visitor's.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    isHomePage(pathname) &&
    request.cookies.get(SIGNED_IN_HINT_COOKIE)?.value === "1"
  ) {
    return NextResponse.redirect(env.NEXT_PUBLIC_APP_URL);
  }
  const target = languageRedirect({
    pathname,
    stored: request.cookies.get(LANGUAGE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  if (target) {
    return NextResponse.redirect(new URL(target + search, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every page, including mistyped ones, so they get a translated 404. Next's
  // own files and the icons are left alone.
  matcher: [
    "/((?!_next/|icon|apple-icon|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
