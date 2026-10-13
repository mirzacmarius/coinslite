import { prefersReducedMotion } from "./env";
import { initReveals } from "./reveal";
import { initScroll, resetScroll, startScroll, stopScroll } from "./scroll";
import { playEnter, playLeave } from "./transition";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export { ease, isTouch, prefersReducedMotion } from "./env";
export { onScroll, scrollState, scrollToTarget } from "./scroll";

/*
 * The page lifecycle, with no framework in it. The Next adapter (next.tsx)
 * calls boot() once, then leave() → cleanup() before a route changes and
 * enter() after the new page is in. Page code hooks in with onPage(fn): fn
 * runs inside a gsap.context on every page, so its tweens and ScrollTriggers
 * are reverted on the way out; it may return a cleanup for the rest.
 */

export type PageFn = (page: {
  intro: gsap.core.Timeline;
  path: string;
  // A page function returns nothing, or a cleanup.
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
}) => void | (() => void);

const pageFns = new Set<PageFn>();
const cleanups: (() => void)[] = [];
let context: gsap.Context | null = null;
let intro: gsap.core.Timeline | null = null;
let ready = false;
let booted = false;

function runPageFn(fn: PageFn) {
  context?.add(() => {
    const cleanup = fn({ intro: intro!, path: location.pathname });
    if (typeof cleanup === "function") cleanups.push(cleanup);
  });
}

/** Runs `fn` on every page (and now, if a page is ready). Returns an unsubscribe. */
export function onPage(fn: PageFn) {
  pageFns.add(fn);
  if (ready) runPageFn(fn);
  return () => {
    pageFns.delete(fn);
  };
}

function syncFlags() {
  const classes = document.documentElement.classList;
  classes.add("js", "is-booted");
  classes.toggle("motion", !prefersReducedMotion());
}

function initPage(instant = false) {
  syncFlags();
  context = gsap.context(() => {
    intro = initReveals(document, instant);
  });
  ready = true;
  for (const fn of pageFns) runPageFn(fn);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/** Whether the engine has booted in this document. */
export const isBooted = () => booted;

/** The first page: scroll, the site's own motion (`setup`), then the entrance. */
export function boot(setup?: () => void) {
  if (booted) return;
  booted = true;
  syncFlags();
  initScroll();
  setup?.();
  initPage();
  intro?.play();
}

/** Covers the page before the route changes. */
export async function leave() {
  stopScroll();
  await playLeave();
}

/** Reverts the old page's tweens, ScrollTriggers and splits. */
export function cleanup() {
  if (!ready) return;
  ready = false;
  for (const fn of cleanups.splice(0)) fn();
  context?.revert();
  context = null;
}

/** The new page is in: set it up and uncover it. No curtain on back and forward. */
export async function enter({ transition = true, scrollTop = true } = {}) {
  if (!booted) return;
  cleanup();
  if (scrollTop) resetScroll();
  // Back and forward return to a page as it was left: no reveals to wait for.
  initPage(!transition);
  if (transition) await playEnter();
  startScroll();
  intro?.play();
}
