import { prefersReducedMotion } from "./env";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling on the one clock: GSAP's ticker drives Lenis, and
 * ScrollTrigger reads Lenis. Under reduced motion the page keeps native
 * scrolling and only the scroll feed runs.
 */
export type ScrollState = { y: number; velocity: number; progress: number };

let lenis: Lenis | null = null;
let native = false;
const listeners = new Set<(state: ScrollState) => void>();
const state: ScrollState = { y: 0, velocity: 0, progress: 0 };

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
  for (const listener of listeners) listener(state);
}

export function initScroll() {
  if (lenis || native) return;
  if (prefersReducedMotion()) {
    native = true;
    addEventListener("scroll", nativeTick, { passive: true });
    return;
  }
  // Links to a section are glided to by the router adapter (next.tsx); the
  // skip link keeps its native jump, which moves focus.
  lenis = new Lenis({ lerp: 0.12 });
  lenis.on("scroll", (instance: Lenis) => {
    state.y = instance.scroll;
    state.velocity = instance.velocity;
    // Lenis says 1 on a page that can't scroll.
    state.progress = instance.limit > 0 ? instance.scroll / instance.limit : 0;
    ScrollTrigger.update();
    for (const listener of listeners) listener(state);
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const onScroll = (listener: (state: ScrollState) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const scrollState = () => state;
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else scrollTo(0, 0);
  state.y = 0;
  state.velocity = 0;
}

/**
 * Glides to a section. The visitor asked for it, so a page that was held
 * still (the phone menu stops it while open) starts scrolling again first.
 */
export function scrollToTarget(target: string | HTMLElement) {
  if (lenis) {
    lenis.start();
    lenis.scrollTo(target, { offset: -96, duration: 1.2 });
    return;
  }
  const element =
    typeof target === "string" ? document.querySelector(target) : target;
  element?.scrollIntoView();
}
