"use client";

import { hasUnsavedInput, onUnsavedInputChange } from "@/lib/unsaved-input";
import { useEffect } from "react";

const CHECK_EVERY_MS = 5 * 60 * 1000;
/** Focus and tab switches can come in bursts; check at most this often. */
const MIN_GAP_MS = 60 * 1000;

/**
 * Moves an open tab to a newly deployed version: it asks which deployment is
 * live when the window gains focus, when the tab becomes visible again, and
 * every five minutes, and reloads if it's newer. A form with unsaved input
 * holds the reload until it's saved or dismissed. Next.js covers navigations;
 * this covers tabs left open.
 */
export function NewDeploymentReload() {
  useEffect(() => {
    // The deployment this page's code came from, compiled in at build time.
    const current = process.env.NEXT_PUBLIC_DEPLOYMENT_ID;
    if (!current) return; // Local development has no deployment id.
    let lastCheck = 0;
    let waitingToReload = false;

    const reloadWhenSafe = () => {
      if (hasUnsavedInput()) waitingToReload = true;
      else window.location.reload();
    };
    const check = async () => {
      if (waitingToReload || Date.now() - lastCheck < MIN_GAP_MS) return;
      lastCheck = Date.now();
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const { deploymentId } = (await response.json()) as {
          deploymentId: string | null;
        };
        if (deploymentId && deploymentId !== current) reloadWhenSafe();
      } catch {
        // Offline or mid-deploy: the next check tries again.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onFocus, CHECK_EVERY_MS);
    const stopListening = onUnsavedInputChange(() => {
      if (waitingToReload && !hasUnsavedInput()) window.location.reload();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      stopListening();
    };
  }, []);
  return null;
}
