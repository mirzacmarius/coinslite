"use client";

import { rememberLanguage } from "@/lib/language-cookie";
import { startScroll, stopScroll } from "@/motion/scroll";
import type { Locale } from "@coinslite/i18n";
import { useEffect, useRef, useState } from "react";

/**
 * The phone's way to the sections: a button in the bar that opens a panel of
 * large links under it. Focus moves into the panel and stays there until
 * Escape or a link closes it.
 */
export function MobileMenu({
  label,
  close,
  links,
  actions,
  language,
  languages,
}: {
  label: string;
  close: string;
  links: { href: string; label: string }[];
  actions: { href: string; label: string }[];
  /** The languages' heading, and each language of this page. */
  language: string;
  languages: {
    locale: Locale;
    href: string;
    label: string;
    current: boolean;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    stopScroll();
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const stops = [
        button.current,
        ...panel.current.querySelectorAll<HTMLElement>("a"),
      ].filter((node): node is HTMLElement => node !== null);
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      startScroll();
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="tap draw text-sm font-semibold lg:hidden"
        aria-expanded={open}
        aria-controls="menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? close : label}
      </button>
      {open && (
        <div
          ref={panel}
          id="menu-panel"
          className="menu-panel lg:hidden"
          data-lenis-prevent
        >
          <ul className="menu-panel__links">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <nav aria-label={language} className="flex flex-col gap-2">
            <p className="label">{language}</p>
            <ul className="menu-panel__languages">
              {languages.map((item) => (
                <li key={item.locale}>
                  <a
                    href={item.href}
                    lang={item.locale}
                    hrefLang={item.locale}
                    aria-current={item.current ? "page" : undefined}
                    // Another language is another root layout: load it in full.
                    data-no-transition
                    className="tap"
                    onClick={() => {
                      rememberLanguage(item.locale);
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="flex flex-col gap-3 text-[0.95rem] font-semibold">
            {actions.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="draw">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
