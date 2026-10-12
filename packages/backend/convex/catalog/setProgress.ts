import type { CatalogItemType, CatalogKind } from "./fields";
import { completion } from "./setRules";

/**
 * Set progress on the Overview (spec 9): the Sets a person is closest to
 * completing, among those they hold an entry of. The server finds, a page of
 * Items at a time, which Sets the held entries open with "View as Set"
 * (catalog/sets.ts) and which Sets each entry is in; this picks the Sets to
 * show from everything found. Pure, so the app can choose once every page
 * is in.
 */

/** What a Set is of: a grouping, or a country's denomination and series. Null is "none". */
export type SetScope = {
  key: string;
  denomination?: string | null;
  series?: string | null;
};

/**
 * What tells a Set apart: a grouping's key, or for a denomination path its
 * country's key, denomination and series.
 */
export function setIdOf({ key, denomination, series }: SetScope) {
  return denomination === undefined
    ? key
    : JSON.stringify([key, denomination, series ?? null]);
}

/** A Catalog node, as the app names it (useCatalogFormat's nodeTitle). */
export type NodeName = {
  key: string;
  title: string;
  kind?: CatalogKind;
  country?: string;
  countryNode: boolean;
  denomination?: string;
  itemType?: CatalogItemType;
  series?: string;
};

/** A Set the person holds at least one entry of. */
export type FoundSet = {
  /** Tells Sets apart from page to page. */
  id: string;
  scope: SetScope;
  /** The grouping it is of: on a denomination path, the country. */
  node: NodeName;
  /** The grouping right above a grouping Set, if any. */
  parent?: NodeName;
  /** How many entries it has. */
  total: number;
};

/** A Catalog entry the person holds, with the ids of the Sets it is in. */
export type HeldEntry = { id: string; sets: string[] };

/** The Sets found and the entries held, from one page of Items or all of them. */
export type SetProgress = { sets: FoundSet[]; held: HeldEntry[] };

/**
 * Two pages' findings as one: each Set and each held entry once, however
 * many pages found it.
 */
export function combineSetProgress(
  a: SetProgress,
  b: SetProgress,
): SetProgress {
  const once = <T extends { id: string }>(first: T[], second: T[]) => [
    ...new Map(
      [...first, ...second].map((found) => [found.id, found]),
    ).values(),
  ];
  return { sets: once(a.sets, b.sets), held: once(a.held, b.held) };
}

/** How many Sets the Overview shows at most. */
export const SETS_SHOWN = 3;

/**
 * The Sets most nearly complete, with how complete each is as the Set view
 * works it out (setRules.ts completion), at most `SETS_SHOWN`.
 */
export function closestSets({ sets, held }: SetProgress) {
  const heldIn = new Map<string, number>();
  for (const entry of held)
    for (const id of entry.sets) heldIn.set(id, (heldIn.get(id) ?? 0) + 1);
  return sets
    .map((set) => ({
      ...set,
      ...completion(heldIn.get(set.id) ?? 0, set.total),
    }))
    .filter((set) => set.held < set.total)
    .sort(
      (a, b) =>
        b.held / b.total - a.held / a.total ||
        a.total - a.held - (b.total - b.held),
    )
    .slice(0, SETS_SHOWN);
}
