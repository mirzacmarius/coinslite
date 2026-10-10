"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { api } from "@coinslite/backend/convex/_generated/api";
import {
  type AlloyMetal,
  type Provenance,
  noMintMark,
} from "@coinslite/backend/convex/catalog/fields";
import type { FunctionReturnType } from "convex/server";
import { useMemo } from "react";

/** A Catalog entry as entry lists show it. */
export type CatalogEntryRow = FunctionReturnType<
  typeof api.catalog.browse.entries
>["page"][number];

/** How Catalog facts read, in the current language. */
export function useCatalogFormat() {
  const t = useI18n();
  const locale = useCurrentLocale();
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
    /** A date as precise as the Catalog has it: "1964", "May 1964" or "8 May 2008". */
    const partialDate = (value: string) => {
      const [year, month, day] = value.split("-");
      if (day) return format.date(value);
      if (!month) return year ?? value;
      return new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
    };
    /** "Silver 90 %, Copper 10 %", the metals in the reader's language. */
    const composition = (
      parts: ReadonlyArray<{ metal: AlloyMetal; percent: number }>,
    ) =>
      parts
        .map(
          ({ metal, percent }) =>
            `${t(`items.materials.${metal}`)} ${format.number(percent / 100, {
              style: "percent",
              maximumFractionDigits: 1,
            })}`,
        )
        .join(", ");
    /** Names joined as the reader's language joins a list. */
    const names = (list: readonly string[]) =>
      new Intl.ListFormat(locale, { type: "conjunction" }).format(list);
    const mintMark = (mark: string) =>
      mark === noMintMark ? t("catalogFacts.noMintMark") : mark;
    /** A banknote's width and height. */
    const size = (width: number, height: number) =>
      `${format.number(width)} × ${format.number(height)} ${t("items.millimetres")}`;
    /** A language's name in the reader's language: "English", "Englisch". */
    const languageName = (code: string) =>
      new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
    return {
      nodeTitle,
      partialDate,
      composition,
      names,
      mintMark,
      size,
      languageName,
      years,
      weight,
      fineness,
      millimetres,
      metal,
      rowFacts,
      strikeSuffix,
      credit,
    };
  }, [t, locale, format, labels]);
}
