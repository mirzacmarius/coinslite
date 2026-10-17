import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { defaultPalette, paletteSamples, palettes } from "./palettes";

/**
 * Every palette, in light and dark, against the rules globals.css states:
 * the full set of tokens, WCAG AA for text (4.5:1) and 3:1 for controls,
 * the focus ring and the charts' series. Also checks that the pickers'
 * fixed samples are the palettes' own colours.
 */

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
const css = read("../../../../packages/ui/src/globals.css");
const chartCard = read("../components/collection-totals/chart-card.tsx");

type Rgb = [number, number, number];
type Mode = "light" | "dark";

/** The custom properties set by the rule with exactly this selector. */
function tokensOf(selector: string) {
  const tokens = new Map<string, string>();
  for (const [, found = "", body = ""] of css.matchAll(
    /([^{}]+)\{([^{}]*)\}/g,
  )) {
    if (found.trim() !== selector) continue;
    for (const [, name = "", value = ""] of body.matchAll(
      /--([\w-]+):\s*([^;]+);/g,
    )) {
      tokens.set(name, value.trim());
    }
  }
  return tokens;
}

const selectors = (palette: string): Record<Mode, string> =>
  palette === defaultPalette
    ? { light: ":root", dark: ".dark" }
    : {
        light: `[data-palette="${palette}"]`,
        dark: `.dark[data-palette="${palette}"]`,
      };

function hslToRgb(value: string): Rgb {
  const [h = 0, s = 0, l = 0] = value
    .split(/\s+/)
    .map((part) => Number.parseFloat(part) / (part.endsWith("%") ? 100 : 1));
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [channel(0), channel(8), channel(4)];
}

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16),
  ) as Rgb;
}

function luminance(rgb: Rgb) {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb) {
  const [one, other] = [luminance(a), luminance(b)];
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
}

const text = 4.5;
const control = 3;

/** A colour on each of some backgrounds, at a minimum ratio. */
const on = (colour: string, backgrounds: string[], minimum: number) =>
  backgrounds.map((background) => ({ colour, background, minimum }));

const pages = ["background", "card", "popover"];
const surfaces = [...pages, "sidebar"];

/** The pairings the app uses. */
const pairs = [
  ...on(
    "foreground",
    [...surfaces, "muted", "secondary", "sidebar-accent", "accent"],
    text,
  ),
  ...on("card-foreground", ["card"], text),
  ...on("popover-foreground", ["popover"], text),
  ...on("secondary-foreground", ["secondary"], text),
  ...on("accent-foreground", ["accent"], text),
  ...on("muted-foreground", [...surfaces, "muted", "sidebar-accent"], text),
  ...on("link", surfaces, text),
  ...on("destructive", surfaces, text),
  ...on("success", pages, text),
  ...on("primary-foreground", ["primary"], text),
  ...on("destructive-foreground", ["destructive"], text),
  ...on("success-foreground", ["success"], text),
  ...on("input", pages, control),
  ...on("ring", surfaces, control),
  ...on("primary", ["background", "card", "sidebar"], control),
];

/** The charts' money series, as chart-card.tsx sets them per appearance. */
function seriesColours(mode: Mode) {
  const variant = mode === "dark" ? "dark:" : "";
  return [...chartCard.matchAll(/(dark:)?\[--series-[\w-]+:(#[0-9a-f]{6})\]/g)]
    .filter(([, prefix = ""]) => prefix === variant)
    .map(([, , hex = ""]) => hex);
}

/** A rule's colour tokens: all but the shared --radius. */
const colourNames = (tokens: Map<string, string>) =>
  [...tokens.keys()].filter((name) => name !== "radius").sort();

const defaultColours = colourNames(tokensOf(":root"));

describe.each(palettes)("%s", (palette) => {
  describe.each(["light", "dark"] as const)("%s", (mode) => {
    const tokens = tokensOf(selectors(palette)[mode]);
    const colour = (name: string) => hslToRgb(tokens.get(name) ?? "");

    test("sets every token", () => {
      expect(colourNames(tokens)).toEqual(defaultColours);
    });

    test("meets its contrast ratios", () => {
      const failing = pairs
        .map(({ colour: fg, background, minimum }) => ({
          pair: `${fg} on ${background}`,
          ratio: Number(contrast(colour(fg), colour(background)).toFixed(2)),
          minimum,
        }))
        .filter(({ ratio, minimum }) => ratio < minimum);
      expect(failing).toEqual([]);
    });

    test("shows each chart series at 3:1 on its cards", () => {
      const series = seriesColours(mode);
      expect(series).toHaveLength(3);
      const failing = series.filter(
        (hex) => contrast(hexToRgb(hex), colour("card")) < control,
      );
      expect(failing).toEqual([]);
    });

    test("is sampled in the pickers with its own colours", () => {
      const sample = paletteSamples[palette][mode];
      for (const [name, hex] of [
        ["background", sample.background],
        ["foreground", sample.foreground],
        ["primary", sample.primary],
      ] as const) {
        const expected = colour(name);
        // The tokens are rounded HSL; a channel may land one off the hex.
        const off = hexToRgb(hex).map((value, i) =>
          Math.abs(value - (expected[i] ?? 0)),
        );
        expect({ name, off: Math.max(...off) <= 1 }).toEqual({
          name,
          off: true,
        });
      }
    });
  });
});
