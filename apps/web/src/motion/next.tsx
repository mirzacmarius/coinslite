"use client";

import {
  boot,
  cleanup,
  enter,
  isBooted,
  leave,
  onPage,
  type PageFn,
  scrollToTarget,
} from "./index";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Connects the page lifecycle to the App Router. Rendered once, last in
 * <body>, so every page's effects have registered before it boots. A click on
 * a link to another page of this site covers the page while Next fetches the
 * next one, then pushes; back and forward re-run the page without the
 * curtain. A link opts out with data-no-transition.
 */
export function Engine({ setup }: { setup?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  /** "push" between our own link click and the new page; otherwise "idle". */
  const mode = useRef<"idle" | "push">("idle");
  const first = useRef(true);

  useEffect(() => {
    // Switching language changes the root layout's [locale], which mounts a
    // new layout, and this component with it, mid-navigation: finish it.
    if (isBooted()) {
      void enter().then(() => {
        if (location.hash) scrollToTarget(location.hash);
      });
      return;
    }
    boot(setup);
  }, []);

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element).closest("a");
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download") ||
        link.hasAttribute("data-no-transition")
      ) {
        return;
      }
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) {
        // A section of this page: glide there and keep the address.
        if (!url.hash || !document.querySelector(url.hash)) return;
        event.preventDefault();
        scrollToTarget(url.hash);
        history.replaceState(history.state, "", url.hash);
        return;
      }
      event.preventDefault();
      if (mode.current !== "idle") return;
      mode.current = "push";
      // The curtain's card label names where you're going.
      const label = document.querySelector(".curtain__label");
      if (label) label.textContent = link.textContent?.trim() ?? "";
      const href = url.pathname + url.search + url.hash;
      router.prefetch(href);
      await leave();
      cleanup();
      router.push(href, { scroll: false });
    };
    // When Next falls back to a full page load (a redirect to another site,
    // a deploy in between), Back can bring this page out of the browser's
    // back/forward cache still covered: uncover it.
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted || mode.current !== "push") return;
      mode.current = "idle";
      void enter({ scrollTop: false });
    };
    document.addEventListener("click", onClick, true);
    addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      removeEventListener("pageshow", onShow);
    };
  }, [router]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // A route change we didn't start is back or forward. Next handles the
    // history event before any listener of ours could, and keeps the page
    // that comes back as it was, so enter() cleans up and shows it at once.
    const pop = mode.current !== "push";
    mode.current = "idle";
    void enter({ transition: !pop, scrollTop: !pop }).then(() => {
      if (!pop && location.hash) scrollToTarget(location.hash);
    });
  }, [pathname]);

  return null;
}

/** Page code for one component: runs once the page is in, reverted on the way out. */
export function usePage(fn: PageFn) {
  useEffect(() => onPage(fn), []);
}
