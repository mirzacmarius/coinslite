import type { CountryCode, HomeCurrency } from "@coinslite/i18n";
import type { MarketRates, Metal } from "../spotPrices/rates";

/**
 * A coin's precious metal (spec 5.1). Pure, so the Item form, the Item detail
 * and every total over many Items share it.
 */

/** What an Item records about its precious metal. */
export type MetalContent = {
  metal?: Metal;
  /** Grams per piece. */
  weight?: number;
  /** Above 0 and at most 1. */
  purity?: number;
  quantity: number;
};

/** Whether an Item has what a Metal value needs: a metal, a weight and a purity. */
export const hasMetalValue = (item: MetalContent) =>
  item.metal !== undefined &&
  item.weight !== undefined &&
  item.purity !== undefined;

/**
 * An Item's Metal value: weight × purity × Spot price × Quantity, in whole
 * minor units of `currency`. Undefined when the Item lacks a metal, weight or
 * purity. Totals add these up Item by Item, so they match what each Item shows.
 */
export function metalValue(
  { metal, weight, purity, quantity }: MetalContent,
  rates: MarketRates,
  currency: HomeCurrency,
): number | undefined {
  if (metal === undefined || weight === undefined || purity === undefined)
    return undefined;
  return Math.round(
    weight * purity * rates.spotPricePerGram(metal, currency) * quantity,
  );
}

export type BullionPreset = {
  /** Also the preset's name in the app's language files. */
  id: string;
  metal: Metal;
  /** Grams. */
  weight: number;
  purity: number;
  country: CountryCode;
};

/**
 * Well-known bullion coins (spec 5.4). Picking one in the Item form fills the
 * metal, weight, purity and country, and the title when it's empty.
 */
// biome-ignore format: one preset per line reads as the spec's table
export const bullionPresets = [
  { id: "krugerrandGold1oz", metal: "gold", weight: 33.93, purity: 0.9167, country: "ZA" },
  { id: "krugerrandGoldHalfOz", metal: "gold", weight: 16.965, purity: 0.9167, country: "ZA" },
  { id: "krugerrandGoldQuarterOz", metal: "gold", weight: 8.482, purity: 0.9167, country: "ZA" },
  { id: "krugerrandGoldTenthOz", metal: "gold", weight: 3.393, purity: 0.9167, country: "ZA" },
  { id: "mapleLeafGold", metal: "gold", weight: 31.103, purity: 0.9999, country: "CA" },
  { id: "britanniaGold", metal: "gold", weight: 31.103, purity: 0.9999, country: "GB" },
  { id: "viennaPhilharmonicGold", metal: "gold", weight: 31.103, purity: 0.9999, country: "AT" },
  { id: "americanEagleGold", metal: "gold", weight: 33.93, purity: 0.9167, country: "US" },
  { id: "americanBuffaloGold", metal: "gold", weight: 31.103, purity: 0.9999, country: "US" },
  { id: "pandaGold", metal: "gold", weight: 30, purity: 0.9999, country: "CN" },
  { id: "mapleLeafSilver", metal: "silver", weight: 31.103, purity: 0.9999, country: "CA" },
  { id: "americanEagleSilver", metal: "silver", weight: 31.103, purity: 0.999, country: "US" },
  { id: "britanniaSilver", metal: "silver", weight: 31.103, purity: 0.999, country: "GB" },
  { id: "viennaPhilharmonicSilver", metal: "silver", weight: 31.103, purity: 0.999, country: "AT" },
  { id: "krugerrandSilver", metal: "silver", weight: 31.107, purity: 0.999, country: "ZA" },
  { id: "pandaSilver", metal: "silver", weight: 30, purity: 0.999, country: "CN" },
] as const satisfies readonly BullionPreset[];

export type BullionPresetId = (typeof bullionPresets)[number]["id"];
