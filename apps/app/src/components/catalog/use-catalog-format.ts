"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { api } from "@coinslite/backend/convex/_generated/api";
import type { Provenance } from "@coinslite/backend/convex/catalog/fields";
import type { FunctionReturnType } from "convex/server";
import { useMemo } from "react";

/** A Catalog entry as entry lists show it. */
export type CatalogEntryRow = FunctionReturnType<
  typeof api.catalog.browse.entries
>["page"][number];

/** How Catalog facts read, in the current language. */
export function useCatalogFormat() {
  const t = useI18n();
  const format = useFormatters();
  const labels = useGradeLabels();
  return useMemo(() => {
    /**
     * What a Catalog node is called: a country by its name in the reader's
     * language, anything else by its title, which stays as the Catalog has
     * it (titles and series are kept in the issuing country's language).
     */
    const nodeTitle = (node: {
      key?: string;
      title: string;
      kind?: string;
      country?: string;
      countryNode?: boolean;
      denomination?: string;
      itemType?: string;
      series?: string;
    }) => {
      if (node.key === "eur2-commemoratives")
        return t("catalog.themes.euroCommemoratives");
      if (node.country === "NO" && node.key?.endsWith("-comm"))
        return t("catalog.groupings.commemorativeCoins");
      if (
        node.country === "NO" &&
        node.kind === "grouping" &&
        node.denomination &&
        node.series === undefined
      )
        return t(
          node.itemType === "banknote"
            ? "catalog.groupings.denominationBanknotes"
            : "catalog.groupings.denominationCoins",
          { denomination: node.denomination },
        );
      return node.countryNode && node.country
        ? format.country(node.country)
        : node.title;
    };
    /** "1881", or "1878–1904" for an issue over several years. */
    const years = (from?: number, to?: number) => {
      if (from === undefined) return to === undefined ? undefined : `–${to}`;
      return to === undefined || to === from ? `${from}` : `${from}–${to}`;
    };
    const weight = (grams: number) =>
      `${format.number(grams)} ${t("preciousMetal.grams")}`;
    /** Fineness as catalogues print it: 0.900. */
    const fineness = (share: number) =>
      format.number(share, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 4,
      });
    const millimetres = (value: number) =>
      `${format.number(value)} ${t("items.millimetres")}`;
    /** "Silver 26.73 g 0.900": the metal facts a row has. */
    const metal = (
      entry: Pick<CatalogEntryRow, "metal" | "weight" | "fineness">,
    ) =>
      [
        entry.metal && t(`items.materials.${entry.metal}`),
        entry.weight !== undefined && weight(entry.weight),
        entry.fineness !== undefined && fineness(entry.fineness),
      ]
        .filter(Boolean)
        .join(" ") || undefined;
    /**
     * A row's facts: years, denomination, metal, weight and fineness, and the
     * country when it isn't the person's own.
     */
    const rowFacts = (entry: CatalogEntryRow, ownCountry?: string) =>
      [
        years(entry.yearFrom, entry.yearTo),
        entry.denomination,
        metal(entry),
        entry.country !== undefined &&
          entry.country !== ownCountry &&
          format.country(entry.country),
      ].filter((fact): fact is string => Boolean(fact));
    /** Proof and BU follow the title; circulation strikes go unsaid. */
    const strikeSuffix = (entry: Pick<CatalogEntryRow, "strike">) =>
      entry.strike && entry.strike !== "circulation"
        ? labels.strike(entry.strike)
        : undefined;
    /** Who to credit: source, author (when it isn't the source) and licence. */
    const credit = (provenance: Provenance) =>
      [
        provenance.source,
        provenance.author !== provenance.source && provenance.author,
        provenance.licence,
      ]
        .filter(Boolean)
        .join(" · ");
    return {
      nodeTitle,
      years,
      weight,
      fineness,
      millimetres,
      metal,
      rowFacts,
      strikeSuffix,
      credit,
    };
  }, [t, format, labels]);
}
