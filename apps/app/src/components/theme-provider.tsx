"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * next-themes, with its inline theme script made inert outside the server.
 * The script only has to run while the browser parses the page's HTML; React
 * never runs a script it renders itself, and warns about it whenever the
 * layout renders on the client, e.g. after switching language. A `text/plain`
 * script is a data block React accepts silently, and next-themes already
 * suppresses the hydration warning for the differing type.
 */
export function ThemeProvider(
  props: Omit<ComponentProps<typeof NextThemesProvider>, "scriptProps">,
) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    />
  );
}
