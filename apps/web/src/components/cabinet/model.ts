/**
 * What the cabinet in Fig 1 holds: four drawers, each one Set, and which of
 * its places are filled. Every count the figure shows comes from here.
 */

export type DrawerKey = "stamps" | "notes" | "euro" | "peace";
export type Kind = "coin" | "note" | "stamp";

/** The series' name as the Catalog has it, in the issuing country's language. */
export const PEACE_SERIES = "Peace dollar";

/**
 * The Peace dollar Set as the Catalog has it: every date and mint, 1921 to
 * 1935 (packages/backend/convex/catalog/datasets/usSilverDollars.ts).
 */
export const PEACE_DOLLARS = [
  "1921",
  "1922",
  "1922-D",
  "1922-S",
  "1923",
  "1923-D",
  "1923-S",
  "1924",
  "1924-S",
  "1925",
  "1925-S",
  "1926",
  "1926-D",
  "1926-S",
  "1927",
  "1927-D",
  "1927-S",
  "1928",
  "1928-S",
  "1934",
  "1934-D",
  "1934-S",
  "1935",
  "1935-S",
] as const;

/** The dates still missing in the example, scarcest last. */
const PEACE_MISSING = [
  "1924-S",
  "1926-D",
  "1927-D",
  "1927-S",
  "1921",
  "1934-S",
  "1928",
] as const;

export interface Drawer {
  key: DrawerKey;
  kind: Kind;
  /** How many places the tray has. */
  size: number;
  /** The places that are empty at the start, in the order they get filled. */
  missing: number[];
}

const peaceIndex = (title: string) =>
  (PEACE_DOLLARS as readonly string[]).indexOf(title);

/** Bottom to top, as the drawers sit in the cabinet. */
export const DRAWER_LIST: Drawer[] = [
  { key: "stamps", kind: "stamp", size: 18, missing: [9, 2, 14, 6, 16] },
  { key: "notes", kind: "note", size: 4, missing: [3] },
  {
    key: "peace",
    kind: "coin",
    size: PEACE_DOLLARS.length,
    missing: PEACE_MISSING.map(peaceIndex),
  },
  {
    key: "euro",
    kind: "coin",
    size: 45,
    missing: [12, 31, 4, 40, 22, 17, 36, 8, 27, 43, 1, 19],
  },
];

/** The drawer the figure opens first, and shows before any script runs. */
export const FIRST = 2;

export const heldAtStart = (drawer: Drawer) =>
  Array.from({ length: drawer.size }, (_, at) => !drawer.missing.includes(at));

export const countHeld = (held: readonly boolean[]) =>
  held.filter(Boolean).length;

export interface CabinetText {
  /** "{name} · {held} of {total}" */
  open: string;
  /** "{held} of {total} held" */
  closed: string;
  /** Each drawer's Set: the Peace dollar by its Catalog name, the rest described. */
  names: Record<DrawerKey, string>;
  /** The drawer buttons' group name. */
  drawers: string;
  /** The add button, by what the open drawer holds. */
  add: Record<Kind, string>;
  /** The button that pauses and plays the idle tour. */
  pause: string;
  play: string;
}

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );

/** The readout: the open drawer's Set, or the whole cabinet. */
export function readoutOf(
  text: CabinetText,
  open: number | null,
  held: readonly (readonly boolean[])[],
) {
  if (open === null) {
    const total = DRAWER_LIST.reduce((sum, drawer) => sum + drawer.size, 0);
    const count = held.reduce((sum, list) => sum + countHeld(list), 0);
    return fill(text.closed, { held: count, total });
  }
  const drawer = DRAWER_LIST[open]!;
  return fill(text.open, {
    name: text.names[drawer.key],
    held: countHeld(held[open]!),
    total: drawer.size,
  });
}
