import { ease, prefersReducedMotion } from "./env";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/*
 * Reveals in the site's verb: things come out like a drawer on its runners,
 * sliding a little to the right while their edge opens from the left, and stop
 * softly. Authored in markup:
 *   data-split="lines"   each line of a heading slides out in turn
 *   data-reveal          a block slides out ("slide", the default, or "fade")
 *   data-intro           plays with the page's entrance instead of on scroll
 *   data-delay="0.2"     extra delay in seconds
 * Nothing is hidden under reduced motion or without JavaScript (site.css).
 */

const SHUT = "inset(-25% 100% -35% -4%)";
const OPEN = "inset(-25% -4% -35% -4%)";

function splitTween(element: HTMLElement, intro: boolean) {
  const delay = Number.parseFloat(element.dataset.delay || "0");
  const state = {
    tween: undefined as gsap.core.Tween | undefined,
    done: false,
    asked: false,
  };
  SplitText.create(element, {
    type: "lines",
    linesClass: "split-line",
    autoSplit: true,
    onSplit(self) {
      gsap.set(element, { visibility: "visible" });
      if (state.done) return;
      state.tween = gsap.fromTo(
        self.lines,
        { clipPath: SHUT, x: -28 },
        {
          clipPath: OPEN,
          x: 0,
          duration: 1.15,
          stagger: 0.07,
          ease: ease.out,
          delay,
          paused: intro && !state.asked,
          onComplete: () => {
            state.done = true;
            gsap.set(self.lines, { clearProps: "clipPath,transform" });
          },
          scrollTrigger: intro
            ? undefined
            : { trigger: element, start: "top 88%", once: true },
        },
      );
      return state.tween;
    },
  });
  return () => {
    state.asked = true;
    state.tween?.play();
  };
}

function blockTween(element: HTMLElement, intro: boolean) {
  const kind = element.dataset.reveal || "slide";
  const delay = Number.parseFloat(element.dataset.delay || "0");
  gsap.set(element, { visibility: "visible" });
  const from: gsap.TweenVars =
    kind === "fade" ? { autoAlpha: 0 } : { clipPath: SHUT, x: -32 };
  const to: gsap.TweenVars =
    kind === "fade" ? { autoAlpha: 1 } : { clipPath: OPEN, x: 0 };
  return gsap.fromTo(element, from, {
    ...to,
    duration: kind === "fade" ? 0.9 : 1.2,
    ease: ease.out,
    delay,
    paused: intro,
    onComplete: () => {
      gsap.set(element, { clearProps: "clipPath,transform" });
    },
    scrollTrigger: intro
      ? undefined
      : { trigger: element, start: "top 90%", once: true },
  });
}

/**
 * Wires every reveal under `root`; returns the page's entrance, paused. With
 * `instant` (back and forward, where the page comes back as it was left)
 * everything is shown at once.
 */
export function initReveals(root: ParentNode = document, instant = false) {
  const intro = gsap.timeline({ paused: true });
  if (prefersReducedMotion()) return intro;
  if (instant) {
    gsap.set(root.querySelectorAll("[data-split], [data-reveal]"), {
      visibility: "visible",
    });
    return intro;
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-split]")) {
    const isIntro = element.hasAttribute("data-intro");
    const play = splitTween(element, isIntro);
    if (isIntro) intro.add(play, 0);
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-reveal]")) {
    const isIntro = element.hasAttribute("data-intro");
    const tween = blockTween(element, isIntro);
    if (isIntro) intro.add(() => void tween.play(), 0);
  }
  return intro;
}
