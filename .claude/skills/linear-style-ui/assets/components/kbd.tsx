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

/**
 * The modifier key as shortcut hints show it: "⌘" on Apple devices, "Ctrl"
 * elsewhere, and null until the browser is known (so nothing renders on the server).
 */
export function useModifierKey(): "⌘" | "Ctrl" | null {
  const [key, setKey] = useState<"⌘" | "Ctrl" | null>(null);
  useEffect(() => {
    setKey(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);
  return key;
}
