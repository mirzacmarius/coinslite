import type { CatalogItemType } from "../catalog/fields";
import { denominationText, sameDenomination } from "./denominations";
import type { ItemType } from "./grades";

/**
 * Suggesting Catalog entries for Items added by hand or imported without
 * one (catalogSuggestions.ts reads the candidates). Pure: which entries
 * could be an Item, best first.
 *
 * A candidate is an entry of the Item's type (coin or banknote; stamps
 * have no Catalog) and country whose denomination names the same face value
 * (items/denominations.ts) and whose years include the Item's year. An
 * entry without a last year is still issued, as the Catalog's datasets
 * record it. An Item without a country, year or denomination has none.
 */

export const suggestionLimits = {
  /** Candidates suggested for one Item. */
  candidates: 3,
  /** Suggestions an Item remembers as turned down ("Not this"); older ones are forgotten. */
  dismissed: 20,
  /** Distinct denominations read for one country and Item type. */
  denominations: 200,
  /** Entries of one denomination read for one year, the latest started first. */
  entriesPerDenomination: 50,
  /** Items one look-up after an import takes. */
  items: 50,
} as const;

/** What the matcher reads of an Item. */
export type SuggestedItem = {
  type: ItemType;
  country?: string;
  denomination?: string;
  year?: number;
};

/** What the matcher reads of a Catalog entry: its slim entry has these. */
export type CandidateEntry = {
  key: string;
  title: string;
  itemType?: CatalogItemType;
  country?: string;
  denomination?: string;
  yearFrom?: number;
  yearTo?: number;
};

/** Whether an entry's years include `year`; one without a last year is still issued. */
const coversYear = (entry: CandidateEntry, year: number) =>
  entry.yearFrom !== undefined &&
  entry.yearFrom <= year &&
  (entry.yearTo === undefined || year <= entry.yearTo);

/**
 * The entries that could be the Item, best first, at most `limit`: those
 * whose denomination is written as the Item's come before those that only
 * share its face value, then those with a last year before those still
 * issued, then the fewest years, the latest started and by title.
 */
export function catalogCandidates<T extends CandidateEntry>(
  item: SuggestedItem,
  entries: readonly T[],
  limit: number = suggestionLimits.candidates,
): T[] {
  const { type, country, denomination, year } = item;
  if (type === "stamp" || !country || !denomination || year === undefined)
    return [];
  const written = denominationText(denomination);
  const ranked = entries
    .filter(
      (entry) =>
        (entry.itemType ?? "coin") === type &&
        entry.country === country &&
        entry.denomination !== undefined &&
        sameDenomination(entry.denomination, denomination) &&
        coversYear(entry, year),
    )
    .map((entry) => ({
      entry,
      rank: [
        denominationText(entry.denomination ?? "") === written ? 0 : 1,
        entry.yearTo === undefined ? 1 : 0,
        (entry.yearTo ?? year) - (entry.yearFrom ?? year),
        -(entry.yearFrom ?? 0),
      ],
    }));
  ranked.sort((a, b) => {
    for (const [index, value] of a.rank.entries()) {
      const difference = value - (b.rank[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return (
      a.entry.title.localeCompare(b.entry.title) ||
      a.entry.key.localeCompare(b.entry.key)
    );
  });
  return ranked.slice(0, limit).map(({ entry }) => entry);
}
