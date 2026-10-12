"use client";

import { env } from "@/env";
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
    // site's origin is enough.
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

function ScreenViews({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const params = useParams<{ locale: string; missing?: string[] }>();
  useEffect(() => {
    // The page's address without its query string or hash. A mistyped address
    // that reached the not-found page counts as that page, not as typed.
    const path = params?.missing ? `/${params.locale}/[missing]` : pathname;
    openPanel(clientId)("screenView", `${window.location.origin}${path}`);
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
