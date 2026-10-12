"use client";

import { env } from "@/env.mjs";
import { useParams, usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";

type OpenPanel = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    op?: OpenPanel;
  }
}

/**
 * OpenPanel's script-tag install: calls are queued on window.op until op1.js
 * loads and replays them, taking the first as its init. Queuing init here,
 * before any event, keeps that order whichever component asks first.
 */
function openPanel(clientId: string): OpenPanel {
  if (!window.op) {
    const queue: unknown[][] = [];
    window.op = Object.assign((...args: unknown[]) => void queue.push(args), {
      q: queue,
    });
    window.op("init", { clientId });
    // OpenPanel sends the whole referrer with every event; the referring
    // site's origin is enough, and a page of our own could carry a token.
    window.op("setGlobalProperties", { __referrer: referringSite() });
    const script = document.createElement("script");
    script.src = "https://openpanel.dev/op1.js";
    script.async = true;
    document.head.append(script);
  }
  return window.op;
}

function referringSite() {
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

/** Admin and the design gallery are the team's own pages, not product use. */
const untracked = ["/admin", "/design"];

/**
 * The page as it's counted: the path the browser shows, with each route
 * parameter's value replaced by its name (/collection/[itemId]), so no Item,
 * Album or account id leaves the app. The query string and hash, which carry
 * sign-in codes, email-confirmation tokens and admin searches, never do.
 */
function countedPath(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
) {
  const names = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    if (name === "locale" || value === undefined) continue;
    for (const part of Array.isArray(value) ? value : [value]) {
      names.set(part, `[${name}]`);
    }
  }
  return pathname
    .split("/")
    .map(
      (segment) => names.get(segment) ?? names.get(decoded(segment)) ?? segment,
    )
    .join("/");
}

function decoded(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function ScreenViews({ clientId }: { clientId: string }) {
  // Read only to notice navigations: behind the language rewrite it can name
  // the prefixed route (/en/collection) instead of what the browser shows.
  const pathname = usePathname();
  const params = useParams();
  useEffect(() => {
    const { origin, pathname: shown } = window.location;
    if (untracked.some((p) => shown === p || shown.startsWith(`${p}/`))) return;
    // OpenPanel skips a path it just counted, so changing only the query
    // string (a filter, a sort) isn't another view. The page title it adds
    // names only the section: "Collection", never the Item.
    openPanel(clientId)(
      "screenView",
      `${origin}${countedPath(shown, params ?? {})}`,
    );
  }, [clientId, pathname, params]);
  return null;
}

/**
 * Cookieless usage statistics through OpenPanel (docs/adr/0006), sent only
 * where NEXT_PUBLIC_OPENPANEL_CLIENT_ID is set: Vercel Production. Visitors
 * aren't identified, and screen views are sent here rather than by OpenPanel's
 * own tracking, which sends the full address, query string included.
 */
export function Analytics() {
  const clientId = env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;
  return (
    <Suspense fallback={null}>
      <ScreenViews clientId={clientId} />
    </Suspense>
  );
}
