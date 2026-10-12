"use client";

import { env } from "@/env.mjs";
import { sectionTitle } from "@/lib/use-page-title";
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
 * before any event, keeps that order.
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

/** The screen counted last, so a repeat isn't counted again. */
let lastCounted: string | undefined;

/**
 * The page as it's counted: the path the browser shows, without a language
 * prefix (/ro/collection is /collection) and with each route parameter's value
 * replaced by its name (/collection/[itemId]), so no Item, Album or account id
 * leaves the app. The query string and hash, which carry sign-in codes,
 * email-confirmation tokens and admin searches, never do.
 */
function countedPath(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
) {
  const placeholders = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    if (name === "locale" || value === undefined) continue;
    for (const part of Array.isArray(value) ? value : [value]) {
      placeholders.set(part, `[${name}]`);
    }
  }
  const segments = pathname.split("/");
  if (segments[1] === params.locale) segments.splice(1, 1);
  const path = segments
    .map(
      (segment) =>
        placeholders.get(segment) ??
        placeholders.get(decoded(segment)) ??
        segment,
    )
    .join("/");
  return path || "/";
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
    const path = countedPath(window.location.pathname, params ?? {});
    if (untracked.some((p) => path === p || path.startsWith(`${p}/`))) return;
    const screen = `${window.location.origin}${path}`;
    // Changing only the query string (a filter, a sort) isn't another view.
    if (screen === lastCounted) return;
    lastCounted = screen;
    // Sent as OpenPanel's screenView sends it, but with a title that names
    // only the section ("Collection"): screenView would add the tab's, which
    // can name an Item or Album (usePageTitle).
    openPanel(clientId)("track", "screen_view", {
      __path: screen,
      __title: sectionTitle(),
    });
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
