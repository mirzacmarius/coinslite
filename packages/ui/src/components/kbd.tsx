"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "../utils";

/** A keyboard shortcut hint, e.g. <Kbd>{mod}K</Kbd>. */
export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

type ModifierKey = "⌘" | "Ctrl" | "Strg";

/**
 * The modifier key as shortcut hints show it: "⌘" on Apple devices, else the
 * Ctrl key as keyboards in the page's language label it ("Strg" in German),
 * and null until the browser is known (so nothing renders on the server).
 */
export function useModifierKey(): ModifierKey | null {
  const [key, setKey] = useState<ModifierKey | null>(null);
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setKey("⌘");
    else setKey(document.documentElement.lang === "de" ? "Strg" : "Ctrl");
  }, []);
  return key;
}
