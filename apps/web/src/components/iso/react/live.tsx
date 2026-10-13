"use client";

/*
 * The isometric drawing kit from anatomy (MIT, see THIRD_PARTY_NOTICES.md),
 * adapted to this repo's lint and strict types, its frame loop moved onto
 * GSAP's ticker (the site's one clock).
 */

import { gsap } from "gsap";
import * as React from "react";

const STILLNESS = "(prefers-reduced-motion: reduce)";
const MARGIN = "120px 0px";
const LONGEST_FRAME = 1 / 30;

export const asksForStillness = () =>
  typeof window !== "undefined" && window.matchMedia(STILLNESS).matches;

export function useStillness() {
  return React.useSyncExternalStore(
    (changed) => {
      const query = window.matchMedia(STILLNESS);
      query.addEventListener("change", changed);
      return () => query.removeEventListener("change", changed);
    },
    asksForStillness,
    () => false,
  );
}

export function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = React.useState(false);
  const watched = React.useRef<Element | null>(null);
  const observer = React.useRef<IntersectionObserver | null>(null);
  React.useEffect(() => {
    const node = ref.current;
    if (node === watched.current) return;
    observer.current?.disconnect();
    observer.current = null;
    watched.current = node;
    setInView(false);
    if (!node) return;
    const binding = new IntersectionObserver(
      (entries) => {
        if (watched.current === node && observer.current === binding)
          setInView(Boolean(entries.at(-1)?.isIntersecting));
      },
      { rootMargin: MARGIN },
    );
    observer.current = binding;
    binding.observe(node);
  });
  React.useEffect(
    () => () => {
      observer.current?.disconnect();
      observer.current = null;
      watched.current = null;
    },
    [],
  );
  return inView;
}

export function Stage({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={className} data-inview={inView ? "" : undefined}>
      {children}
    </div>
  );
}

export function useReadout<T extends Element>() {
  const anchor = React.useRef<T>(null);
  const slot = React.useRef<Element | null>(null);
  const said = React.useRef<string | null>(null);
  React.useEffect(() => {
    slot.current =
      anchor.current?.closest(".iso-plate")?.querySelector("[data-readout]") ??
      null;
  }, []);
  const say = React.useCallback((text: string) => {
    slot.current ??=
      anchor.current?.closest(".iso-plate")?.querySelector("[data-readout]") ??
      null;
    if (!slot.current || text === said.current) return;
    said.current = text;
    slot.current.textContent = text;
  }, []);
  return { anchor, say };
}

/**
 * A frame loop on GSAP's ticker, the site's one clock (the kit's original runs
 * its own requestAnimationFrame). It runs while `running` and while `tick`
 * returns true, and `kick()` restarts it.
 */
export function useLoop(
  tick: (dt: number, calm: boolean) => boolean,
  running: boolean,
) {
  const latest = React.useRef(tick);
  latest.current = tick;
  const step = React.useRef<gsap.TickerCallback | null>(null);
  const stop = React.useCallback(() => {
    if (step.current) gsap.ticker.remove(step.current);
    step.current = null;
  }, []);
  const kick = React.useCallback(() => {
    if (step.current) return;
    let first = true;
    const next: gsap.TickerCallback = (_time, deltaTime) => {
      const dt = first ? 1 / 60 : Math.min(deltaTime / 1000, LONGEST_FRAME);
      first = false;
      if (!latest.current(dt, asksForStillness())) stop();
    };
    step.current = next;
    gsap.ticker.add(next);
  }, [stop]);
  React.useEffect(() => {
    if (running) kick();
    else stop();
    return stop;
  }, [running, kick, stop]);
  return kick;
}

export function follow(
  current: number,
  target: number,
  dt: number,
  seconds: number,
  calm = false,
) {
  if (calm) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt / seconds));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

export interface Spring {
  at: number;
  rate: number;
}

export function spring(
  state: Spring,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
  calm = false,
) {
  const drag = calm ? 2 * Math.sqrt(stiffness) : damping;
  const steps = Math.max(Math.ceil(dt * 240), 1);
  const slice = dt / steps;
  for (let step = 0; step < steps; step++) {
    state.rate +=
      (target - state.at) * stiffness * slice - state.rate * drag * slice;
    state.at += state.rate * slice;
  }
  if (Math.abs(target - state.at) < 5e-4 && Math.abs(state.rate) < 5e-4) {
    state.at = target;
    state.rate = 0;
  }
  return state.at === target && state.rate === 0;
}

export function useEased(target: number, seconds = 0.12) {
  const [value, setValue] = React.useState(target);
  const shown = React.useRef(target);
  useLoop((dt, calm) => {
    shown.current = follow(shown.current, target, dt, seconds, calm);
    setValue(shown.current);
    return shown.current !== target;
  }, shown.current !== target);
  return value;
}
