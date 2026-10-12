import {
  type AlloyMetal,
  type CatalogItemType,
  type CatalogKind,
  type CoinEdge,
  type PreciousMetal,
  type Provenance,
  noMintMark,
} from "../catalog/fields";
import { type Metal, metals } from "../spotPrices/rates";
import { sameDenomination } from "./denominations";
import type { Strike } from "./grades";
import { type ItemInput, type Material, fieldSuits, itemLimits } from "./rules";

/**
 * The descriptive facts an Item takes from its Catalog entry (ADR 0001).
 * Pure, so the Item form knows them too.
 *
 * An Item linked to a Catalog entry stores only what's the person's own: a
 * fact held on the Item is their override and wins; a fact the Item doesn't
 * hold comes from the entry each time the Item is read, so Catalog
 * corrections reach it. Items added by hand have no entry and hold all
 * their facts.
 */

/** The Item fields a Catalog entry can provide. Every other field is always the Item's own. */
export const catalogFactNames = [
  "country",
  "year",
  "denomination",
  "series",
  "material",
  "strike",
  "diameter",
  "thickness",
  "mintMark",
  "mintage",
  "numistaNumber",
  "metal",
  "weight",
  "purity",
] as const satisfies ReadonlyArray<keyof ItemInput>;
export type CatalogFactName = (typeof catalogFactNames)[number];

/** A Catalog entry's facts as an Item holds them. */
export type CatalogFacts = Partial<Pick<ItemInput, CatalogFactName>>;

/** What `entryFacts` reads from a Catalog entry. */
export type CatalogEntryFacts = {
  itemType?: CatalogItemType;
  country?: string;
  denomination?: string;
  series?: string;
  material?: Material;
  strike?: Strike;
  metal?: PreciousMetal;
  weight?: number;
  fineness?: number;
  diameter?: number;
  thickness?: number;
  /** A mint mark, or "none" (catalog/fields.ts noMintMark) for a coin without one. */
  mintMark?: string;
  mintage?: number;
  yearFrom?: number;
  yearTo?: number;
  numistaId?: number;
};

/** Each field `entryFacts` reads; the compiler keeps the list whole. */
const entryFactFields: Record<keyof CatalogEntryFacts, true> = {
  itemType: true,
  country: true,
  denomination: true,
  series: true,
  material: true,
  strike: true,
  metal: true,
  weight: true,
  fineness: true,
  diameter: true,
  thickness: true,
  mintMark: true,
  mintage: true,
  yearFrom: true,
  yearTo: true,
  numistaId: true,
};

/**
 * A Catalog entry as Items are resolved from it: its key and title, to link
 * to it, and the fields `entryFacts` reads. No notes, image or sources, so
 * reading one for every Item in a Collection stays small. A read model of
 * the entry (catalog/slimEntries.ts), never edited on its own.
 */
export type SlimEntry = CatalogEntryFacts & { key: string; title: string };

const slimFields = ["key", "title", ...Object.keys(entryFactFields)] as Array<
  keyof SlimEntry
>;

/**
 * A Catalog node's slim entry: only the fields it keeps, and only those set.
 * Null for any node but an entry, as Items link only to entries.
 */
export function slimEntryOf(
  node: SlimEntry & { kind: CatalogKind },
): SlimEntry | null {
  if (node.kind !== "entry") return null;
  const slim: Partial<Record<keyof SlimEntry, unknown>> = {};
  for (const field of slimFields) {
    if (node[field] !== undefined) slim[field] = node[field];
  }
  return slim as SlimEntry;
}

/** Whether two slim entries say the same, so an unchanged one isn't written again. */
export const sameSlimEntry = (a: SlimEntry, b: SlimEntry) =>
  slimFields.every((field) => a[field] === b[field]);

const isItemMetal = (metal: PreciousMetal | undefined): metal is Metal =>
  (metals as readonly string[]).includes(metal ?? "");

/**
 * A Catalog entry's facts in Item terms. An issue of one year gives the
 * Item its year; one over several years leaves the year to the person. The
 * entry's fineness is the Item's purity. Weight and purity are a precious
 * metal's, so they come only with a metal Items value (gold or silver).
 */
export function entryFacts(entry: CatalogEntryFacts): CatalogFacts {
  const type = entry.itemType ?? "coin";
  const coin = (field: Parameters<typeof fieldSuits>[0]) =>
    fieldSuits(field, type);
  const metal = coin("metal") && isItemMetal(entry.metal) ? entry.metal : null;
  const singleYear =
    entry.yearFrom !== undefined &&
    (entry.yearTo === undefined || entry.yearTo === entry.yearFrom);
  const facts: CatalogFacts = {
    country: entry.country,
    year: singleYear ? entry.yearFrom : undefined,
    denomination: entry.denomination,
    series: entry.series,
    material: coin("material") ? entry.material : undefined,
    strike: entry.strike,
    diameter: coin("diameter") ? entry.diameter : undefined,
    // Only values an Item may hold: a thickness to hundredths, within its
    // limit, and a mintage of at least one.
    thickness:
      coin("thickness") &&
      entry.thickness !== undefined &&
      entry.thickness <= itemLimits.thickness
        ? Math.round(entry.thickness * 100) / 100 || undefined
        : undefined,
    // "none" says the coin has no mint mark: the Item shows none either.
    mintMark:
      coin("mintMark") && entry.mintMark !== noMintMark
        ? entry.mintMark
        : undefined,
    mintage:
      coin("mintage") &&
      entry.mintage !== undefined &&
      entry.mintage >= 1 &&
      entry.mintage <= itemLimits.mintage
        ? entry.mintage
        : undefined,
    numistaNumber: coin("numistaNumber") ? entry.numistaId : undefined,
    metal: metal ?? undefined,
    weight: metal ? entry.weight : undefined,
    purity: metal && entry.fineness ? entry.fineness : undefined,
  };
  return definedOnly(facts);
}

/**
 * An Item read with its Catalog entry's facts beneath its own: each fact the
 * Item holds (the person's override) wins, the rest come from the entry.
 */
export function withCatalogFacts<T extends CatalogFacts>(
  item: T,
  facts: CatalogFacts,
): T {
  const resolved: CatalogFacts = { ...item };
  for (const name of catalogFactNames) {
    if (resolved[name] === undefined && facts[name] !== undefined) {
      // Each name's value has that name's type.
      (resolved as Record<CatalogFactName, unknown>)[name] = facts[name];
    }
  }
  return resolved as T;
}

/**
 * What a linked Item stores from a saved form: the facts that differ from
 * its Catalog entry's. A fact set to what the entry says isn't an override,
 * so it keeps following the entry.
 *
 * When an Item is edited, `stored` is what it held before. Only the facts
 * the person changed in this save are judged again; one the form sends back
 * as the Item showed it stays as it was stored, so an override is kept even
 * while the entry happens to say the same. A fact cleared in the form
 * follows the entry again.
 */
export function overridesOnly<T extends CatalogFacts>(
  fields: T,
  facts: CatalogFacts,
  stored?: CatalogFacts,
): T {
  const kept: CatalogFacts = { ...fields };
  const shown = stored && withCatalogFacts(stored, facts);
  for (const name of catalogFactNames) {
    if (shown && kept[name] === shown[name]) {
      // Unchanged in this save: keep what was stored, override or not.
      if (stored[name] === undefined) delete kept[name];
      else (kept as Record<CatalogFactName, unknown>)[name] = stored[name];
    } else if (kept[name] !== undefined && kept[name] === facts[name]) {
      delete kept[name];
    }
  }
  return kept as T;
}

/**
 * The facts an Item added without a Catalog entry keeps as its own when
 * it's linked to one (a suggestion, catalogSuggestions.ts): those the entry
 * says differently or not at all. A fact the entry says the same of follows
 * the entry from then on; a denomination does when it names the same face
 * value, however it's written.
 */
export function overridesOnLink(
  item: CatalogFacts,
  facts: CatalogFacts,
): CatalogFacts {
  const kept: Partial<Record<CatalogFactName, unknown>> = {};
  for (const name of catalogFactNames) {
    const own = item[name];
    if (own === undefined) continue;
    const entry = facts[name];
    const same =
      name === "denomination" && entry !== undefined
        ? sameDenomination(String(own), String(entry))
        : own === entry;
    if (!same) kept[name] = own;
  }
  return kept as CatalogFacts;
}

function definedOnly<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}

/**
 * The facts a Catalog entry holds that Items have no field for: where it was
 * struck, what it's made of, its edge, designers, dates and a banknote's
 * size. An Item page shows them read live from the entry; nothing of them is
 * stored on the Item, and only the ones the entry has are present.
 */
export function entryDetails(entry: {
  mintMark?: string;
  mint?: string;
  composition?: Array<{ metal: AlloyMetal; percent: number }>;
  edge?: CoinEdge;
  edgeLettering?: string;
  designers?: string[];
  issueDate?: string;
  withdrawalDate?: string;
  width?: number;
  height?: number;
}) {
  return definedOnly({
    // Not a fact an Item holds, so said here: the coin has no mint mark.
    noMintMark: entry.mintMark === noMintMark ? (true as const) : undefined,
    mint: entry.mint,
    composition: entry.composition,
    edge: entry.edge,
    edgeLettering: entry.edgeLettering,
    designers: entry.designers?.length ? entry.designers : undefined,
    issueDate: entry.issueDate,
    withdrawalDate: entry.withdrawalDate,
    width: entry.width,
    height: entry.height,
  });
}
export type EntryDetails = ReturnType<typeof entryDetails>;

/**
 * The credit an Item page shows for the facts it takes from its Catalog
 * entry: the entry's facts credit, as long as the Item shows at least one of
 * the entry's facts, or of the details only the entry holds. None for an
 * Item without an entry, or one whose own facts (the person's overrides)
 * replace every fact the entry gives.
 */
export function factsCreditFor(
  item: CatalogFacts,
  entry: {
    facts: CatalogFacts;
    details: Partial<EntryDetails>;
    credit?: Provenance;
  } | null,
): Provenance | null {
  if (!entry?.credit) return null;
  const fromEntry =
    Object.values(entry.details).some((detail) => detail !== undefined) ||
    catalogFactNames.some(
      (name) => item[name] === undefined && entry.facts[name] !== undefined,
    );
  return fromEntry ? entry.credit : null;
}

/**
 * What an Item linked to a Catalog entry becomes as the entry leaves the
 * Catalog: it takes the entry's facts as its own, keeping those the person
 * changed, keeps a copy of the facts it has no field for (shown where the
 * Item page showed them from the entry), and stops linking to it. Nobody's
 * Item loses a fact.
 */
export function detachedFields<T extends CatalogFacts>(
  item: T,
  entry: CatalogEntryFacts & Parameters<typeof entryDetails>[0],
): Omit<T, "catalogDetails" | "catalogEntryId"> & {
  catalogDetails: EntryDetails | undefined;
  catalogEntryId: undefined;
} {
  const details = entryDetails(entry);
  return {
    ...withCatalogFacts(item, entryFacts(entry)),
    catalogDetails: Object.keys(details).length > 0 ? details : undefined,
    catalogEntryId: undefined,
  };
}
