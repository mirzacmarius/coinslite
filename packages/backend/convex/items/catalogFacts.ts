import type { CatalogItemType, PreciousMetal } from "../catalog/fields";
import { type Metal, metals } from "../spotPrices/rates";
import type { Strike } from "./grades";
import { type ItemInput, type Material, fieldSuits } from "./rules";

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
  yearFrom?: number;
  yearTo?: number;
  numistaId?: number;
};

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
 */
export function overridesOnly<T extends CatalogFacts>(
  fields: T,
  facts: CatalogFacts,
): T {
  const kept: CatalogFacts = { ...fields };
  for (const name of catalogFactNames) {
    if (kept[name] !== undefined && kept[name] === facts[name]) {
      delete kept[name];
    }
  }
  return kept as T;
}

function definedOnly<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}
