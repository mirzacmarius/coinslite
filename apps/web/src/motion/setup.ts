import { ease, onPage, onScroll, prefersReducedMotion } from "./index";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The site's own motion, set up once on the client before the first page.
 * One idea runs through it: the page is a cabinet, and the drawer in use is
 * the one that is out. The header steps aside while you read down and comes
 * back when you scroll up; the section index slides its marker to the drawer
 * you are in; the example record fills in, field by field, as its chapters
 * pass.
 */
export function setupMotion() {
  let last = 0;
  onScroll(({ y }) => {
    if (Math.abs(y - last) < 6) return;
    document.documentElement.classList.toggle(
      "frame-away",
      y > 240 && y > last,
    );
    last = y;
  });

  onPage(() => {
    const nav = document.querySelector<HTMLElement>("[data-index]");
    const marker = nav?.querySelector<HTMLElement>("[data-marker]");
    if (!nav || !marker) return;
    const links = [...nav.querySelectorAll<HTMLAnchorElement>("a[href*='#']")];
    const mark = (link: HTMLAnchorElement | null) => {
      for (const each of links)
        each.toggleAttribute("data-current", each === link);
      if (!link) {
        gsap.to(marker, { autoAlpha: 0, duration: 0.3, ease: ease.soft });
        return;
      }
      const box = link.getBoundingClientRect();
      const frame = nav.getBoundingClientRect();
      gsap.to(marker, {
        autoAlpha: 1,
        x: box.left - frame.left,
        width: box.width,
        duration: prefersReducedMotion() ? 0 : 0.55,
        ease: ease.out,
      });
    };
    for (const link of links) {
      const id = new URL(link.href).hash;
      const section = id ? document.querySelector<HTMLElement>(id) : null;
      if (!section) continue;
      ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => {
          if (self.isActive) mark(link);
          else if (
            !links.some(
              (each) => each !== link && each.hasAttribute("data-current"),
            )
          ) {
            mark(null);
          }
        },
      });
    }
  });

  onPage(() => {
    const toc = document.querySelector<HTMLElement>("[data-toc]");
    if (!toc) return;
    const links = [...toc.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];
    for (const link of links) {
      const section = document.querySelector<HTMLElement>(link.hash);
      if (!section) continue;
      ScrollTrigger.create({
        trigger: section,
        start: "top 40%",
        end: "bottom 40%",
        onToggle: (self) => {
          if (!self.isActive) return;
          for (const each of links) {
            each.toggleAttribute("data-current", each === link);
            if (each === link) each.setAttribute("aria-current", "location");
            else each.removeAttribute("aria-current");
          }
        },
      });
    }
  });

  onPage(() => {
    const record = document.querySelector<HTMLElement>("[data-record]");
    const card = record?.querySelector<HTMLElement>("[data-record-card]");
    if (!record || !card) return;
    // On a phone the card sits above its chapters, so it shows complete.
    if (prefersReducedMotion() || !matchMedia("(min-width: 64rem)").matches) {
      return;
    }
    const chapters = [
      ...record.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    card.dataset.step = "0";
    chapters.forEach((chapter, index) => {
      ScrollTrigger.create({
        trigger: chapter,
        start: "top 62%",
        end: "bottom 62%",
        onToggle: (self) => {
          if (self.isActive) card.dataset.step = String(index + 1);
        },
        onLeaveBack: () => {
          if (index === 0) card.dataset.step = "0";
        },
      });
    });
    return () => {
      card.dataset.step = "all";
    };
  });
}
