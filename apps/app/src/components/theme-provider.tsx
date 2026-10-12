"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";
import { useLayoutEffect } from "react";

type ThemeProviderProps = Omit<
  ComponentProps<typeof NextThemesProvider>,
  "scriptProps"
>;

/**
 * next-themes, with its inline theme script made inert outside the server.
 * The script only has to run while the browser parses the page's HTML; React
 * never runs a script it renders itself, and warns about it whenever the
 * layout renders on the client, e.g. after switching language. A `text/plain`
 * script is a data block React accepts silently, and next-themes already
 * suppresses the hydration warning for the differing type.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    >
      <StoredTheme
        storageKey={props.storageKey ?? "theme"}
        defaultTheme={
          props.defaultTheme ??
          (props.enableSystem === false ? "light" : "system")
        }
      />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Keeps the provider on the theme stored in this browser. next-themes reads
 * it once, when it mounts. With Cache Components a page left behind stays
 * mounted, hidden (docs/adr/0004), and the layout is per language, so each
 * language's provider kept the theme it had when the person last left it,
 * and put it back when they switched to that language again. Layout effects
 * run again whenever a hidden page shows, before it paints, so this sets the
 * stored theme first.
 */
function StoredTheme({
  storageKey,
  defaultTheme,
}: {
  storageKey: string;
  defaultTheme: string;
}) {
  const { theme, setTheme } = useTheme();
  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }
    const current = stored ?? defaultTheme;
    if (current !== theme) setTheme(current);
  }, [storageKey, defaultTheme, theme, setTheme]);
  return null;
}
