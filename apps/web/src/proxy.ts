import { env } from "@/env";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Set by the product app while someone is signed in; the name is shared with
 * apps/app/src/proxy.ts. It reaches this site when both share a parent domain,
 * or on localhost.
 */
const SIGNED_IN_HINT_COOKIE = "coinslite-signed-in";

/** Signed-in visitors skip the home page and go straight to their collection. */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SIGNED_IN_HINT_COOKIE)?.value === "1") {
    return NextResponse.redirect(env.NEXT_PUBLIC_APP_URL);
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
