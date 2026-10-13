import { ease, prefersReducedMotion } from "./env";
import { gsap } from "gsap";

/**
 * Between pages a velvet panel slides across the screen like a drawer front
 * pushed shut, then slides on and off the far side to show the next page.
 */
export type Transition = {
  leave: (curtain: HTMLElement) => gsap.core.Animation;
  enter: (curtain: HTMLElement) => gsap.core.Animation;
};

const panel = (curtain: HTMLElement) =>
  curtain.querySelector<HTMLElement>(".curtain__panel");

const drawer: Transition = {
  leave: (curtain) =>
    gsap
      .timeline()
      .set(curtain, { autoAlpha: 1 })
      .fromTo(
        panel(curtain),
        { xPercent: -101 },
        { xPercent: 0, duration: 0.75, ease: ease.inOut },
      ),
  enter: (curtain) =>
    gsap
      .timeline()
      .to(panel(curtain), { xPercent: 101, duration: 0.8, ease: ease.inOut })
      .set(curtain, { autoAlpha: 0 }),
};

const reduced: Transition = {
  leave: (curtain) =>
    gsap
      .timeline()
      .set(panel(curtain), { xPercent: 0 })
      .fromTo(curtain, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }),
  enter: (curtain) => gsap.to(curtain, { autoAlpha: 0, duration: 0.2 }),
};

const pick = () => (prefersReducedMotion() ? reduced : drawer);
const curtainOf = () => document.getElementById("curtain");

export async function playLeave() {
  const curtain = curtainOf();
  if (curtain) await pick().leave(curtain);
}

export async function playEnter() {
  const curtain = curtainOf();
  if (curtain) await pick().enter(curtain);
}
