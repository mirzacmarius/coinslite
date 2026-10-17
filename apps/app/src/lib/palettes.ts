/**
 * The app's colour schemes, called Colours on screen ("Theme" means a Catalog
 * grouping in CoinsLite). Each has a light and a dark version in
 * packages/ui/src/globals.css, chosen by `data-palette` on the html element;
 * Obsidian, the default, is the plain `:root` and `.dark` tokens. Indigo, the
 * app's colours before these, stays one of the choices. The choice is kept
 * in this browser, like the appearance (light, dark or system).
 */
export const palettes = [
  "obsidian",
  "midnight",
  "forest",
  "plum",
  "indigo",
] as const;

export type Palette = (typeof palettes)[number];

export const defaultPalette: Palette = "obsidian";

export const paletteStorageKey = "palette";

export function isPalette(value: unknown): value is Palette {
  return palettes.includes(value as Palette);
}

/** The palette stored in this browser, if any and still offered. */
export function storedPalette(): Palette | undefined {
  try {
    const stored = window.localStorage.getItem(paletteStorageKey);
    return isPalette(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export type PaletteSample = {
  background: string;
  foreground: string;
  primary: string;
};

/**
 * Each palette's page colour, its text and its accent, in light and dark: the
 * pickers' samples, which show a palette or appearance other than the current
 * one, so CSS variables can't supply them. palettes.test.ts checks them
 * against globals.css.
 */
export const paletteSamples: Record<
  Palette,
  Record<"light" | "dark", PaletteSample>
> = {
  obsidian: {
    light: { background: "#faf9f5", foreground: "#1c1a17", primary: "#8c6828" },
    dark: { background: "#111113", foreground: "#f5f1e8", primary: "#c6a76a" },
  },
  midnight: {
    light: { background: "#f6f9fc", foreground: "#111a2a", primary: "#2e63ad" },
    dark: { background: "#111a2a", foreground: "#f1f5fb", primary: "#8dbbff" },
  },
  forest: {
    light: { background: "#f6f8f4", foreground: "#182a21", primary: "#82621b" },
    dark: { background: "#0f1712", foreground: "#f1f3ec", primary: "#bda66a" },
  },
  plum: {
    light: { background: "#fcf7fa", foreground: "#26162b", primary: "#9a4f58" },
    dark: { background: "#211623", foreground: "#f7f0f5", primary: "#d6a0a0" },
  },
  indigo: {
    light: { background: "#f9f9fa", foreground: "#1b1b1f", primary: "#5e6ad2" },
    dark: { background: "#191a22", foreground: "#e3e4ea", primary: "#5e6ad2" },
  },
};
