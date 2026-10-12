"use client";

import { AlbumDot } from "@/components/albums/album-colours";
import { useAlbums } from "@/components/albums/use-albums";
import { useGradeLabels } from "@/components/items/grade-labels";
import { itemTypeIcons, itemTypes } from "@/components/items/item-fields";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CollectionView,
  withoutAlbum,
} from "@coinslite/backend/convex/collection/view";
import type { FunctionReturnType } from "convex/server";
import {
  Award,
  BookOpen,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  FolderOpen,
  Globe,
  type LucideIcon,
  MapPin,
  Shapes,
} from "lucide-react";
import type * as React from "react";
import { useMemo } from "react";

/** One page of the Collection being browsed, as `collection.page` reads it. */
export type BrowseResult = FunctionReturnType<typeof api.collection.page>;
/** How many Items each filter option would show, read only while the filters are open. */
export type FilterCounts = FunctionReturnType<
  typeof api.collection.filterCounts
>;

export type FilterDimension =
  | "type"
  | "origin"
  | "country"
  | "denomination"
  | "grade"
  | "album"
  | "entry"
  | "without"
  | "status";

export type FilterOption = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  /** How many Items picking it would show; undefined while the counts load. */
  count?: number;
  selected: boolean;
  /** What picking it changes in the view. */
  change: Partial<CollectionView>;
};

export type Filter = {
  dimension: FilterDimension;
  label: string;
  icon: LucideIcon;
  options: FilterOption[];
  /** What removing the filter changes in the view. */
  clear: Partial<CollectionView>;
  /** The chosen option, when the filter is on. */
  active?: { label: string; icon?: React.ReactNode };
  /** False for a filter only links turn on: it shows as a chip, not in the menu. */
  inMenu?: false;
  /** While the counts load, options found only from them (countries, denominations, Grades) aren't listed yet. */
  counting: boolean;
};

const optionIcon = (Icon: LucideIcon) => (
  <Icon
    className="text-muted-foreground"
    strokeWidth={1.75}
    aria-hidden="true"
  />
);

const sameText = (a: string | undefined, b: string) =>
  a !== undefined &&
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Every filter the Collection offers, each with its options, their counts
 * once they're loaded (only while the filters are open), and which option
 * is on. Origin is offered only when the person has an own country to
 * compare with.
 */
export function useFilters(
  result: BrowseResult | undefined,
  counts: FilterCounts | undefined,
  view: CollectionView,
): Filter[] {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const labels = useGradeLabels();
  const albums = useAlbums();

  return useMemo(() => {
    const ownCountry = result?.ownCountry ?? null;
    const counting = counts === undefined;
    // What an option counts while it isn't in the counts: none, once known.
    const uncounted = counting ? undefined : 0;
    const filters: Omit<Filter, "counting">[] = [];

    const typeOptions: FilterOption[] = itemTypes.flatMap((type) => {
      const plain: FilterOption = {
        key: type,
        label: t(`items.types.${type}`),
        icon: optionIcon(itemTypeIcons[type]),
        count: counts?.types[type] ?? uncounted,
        selected: view.type === type && !view.bullionOnly,
        change: { type, bullionOnly: undefined },
      };
      if (type !== "coin") return [plain];
      return [
        plain,
        {
          key: "bullion",
          label: t("collection.bullionCoins"),
          icon: optionIcon(itemTypeIcons.coin),
          count: counts?.types.bullion ?? uncounted,
          selected: view.bullionOnly === true,
          change: { type: "coin", bullionOnly: true },
        },
      ];
    });
    filters.push({
      dimension: "type",
      label: t("collection.filters.type"),
      icon: Shapes,
      options: typeOptions,
      clear: { type: undefined, bullionOnly: undefined },
    });

    if (ownCountry) {
      filters.push({
        dimension: "origin",
        label: t("collection.filters.origin"),
        icon: MapPin,
        options: [
          {
            key: "own",
            label: t("collection.origins.own", {
              country: format.country(ownCountry),
            }),
            count: counts?.origins.own ?? uncounted,
            selected: view.origin === "own",
            change: { origin: "own" },
          },
          {
            key: "foreign",
            label: t("collection.origins.foreign"),
            count: counts?.origins.foreign ?? uncounted,
            selected: view.origin === "foreign",
            change: { origin: "foreign" },
          },
        ],
        clear: { origin: undefined },
      });
    }

    const countries = counts?.countries ?? [];
    const countryOptions = [
      ...countries,
      ...(view.country && !countries.some((c) => c.country === view.country)
        ? [{ country: view.country, count: uncounted }]
        : []),
    ]
      .map(
        ({ country, count }): FilterOption => ({
          key: country,
          label: format.country(country),
          count,
          selected: view.country === country,
          change: { country },
        }),
      )
      .sort((a, b) => a.label.localeCompare(b.label, locale));
    filters.push({
      dimension: "country",
      label: t("collection.filters.country"),
      icon: Globe,
      options: countryOptions,
      clear: { country: undefined },
    });

    const denominations = counts?.denominations ?? [];
    const denominationOptions = [
      ...denominations,
      ...(view.denomination &&
      !denominations.some((d) => sameText(view.denomination, d.denomination))
        ? [{ denomination: view.denomination, count: uncounted }]
        : []),
    ].map(
      ({ denomination, count }): FilterOption => ({
        key: denomination,
        label: denomination,
        count,
        selected: sameText(view.denomination, denomination),
        change: { denomination },
      }),
    );
    filters.push({
      dimension: "denomination",
      label: t("collection.filters.denomination"),
      icon: CircleDollarSign,
      options: denominationOptions,
      clear: { denomination: undefined },
    });

    const grades = counts?.grades ?? [];
    const chosenGrade = view.grade;
    const gradeOptions = [
      ...grades,
      ...(chosenGrade &&
      !grades.some(
        (g) =>
          g.gradingScale === chosenGrade.gradingScale &&
          g.grade === chosenGrade.grade,
      )
        ? [{ ...chosenGrade, count: uncounted }]
        : []),
    ].map(
      ({ gradingScale, grade, count }): FilterOption => ({
        key: `${gradingScale}:${grade}`,
        label: labels.grade(gradingScale, grade),
        hint: labels.scale(gradingScale),
        count,
        selected:
          chosenGrade?.gradingScale === gradingScale &&
          chosenGrade.grade === grade,
        change: { grade: { gradingScale, grade } },
      }),
    );
    filters.push({
      dimension: "grade",
      label: t("collection.filters.grade"),
      icon: Award,
      options: gradeOptions,
      clear: { grade: undefined },
    });

    const albumCounts = new Map(
      counts?.albums.map(({ albumId, count }) => [albumId as string, count]),
    );
    const albumOptions: FilterOption[] = [
      ...(albums ?? []).map((album) => ({
        key: album._id,
        label: album.name,
        icon: <AlbumDot colour={album.colour} />,
        count: albumCounts.get(album._id) ?? uncounted,
        selected: view.album === album._id,
        change: { album: album._id },
      })),
      {
        key: withoutAlbum,
        label: t("collection.withoutAlbum"),
        count: counts?.withoutAlbum ?? uncounted,
        selected: view.album === withoutAlbum,
        change: { album: withoutAlbum },
      },
    ];
    filters.push({
      dimension: "album",
      label: t("collection.filters.album"),
      icon: FolderOpen,
      options: albumOptions,
      clear: { album: undefined },
      // An Album deleted or not this person's still shows as a filter to remove.
      ...(view.album &&
        albums &&
        !albumOptions.some((option) => option.selected) && {
          active: { label: t("collection.unknownAlbum") },
        }),
    });

    // Too many entries to list: links narrow to one ("You hold" on an entry).
    if (view.entry) {
      // Named once the result says which entry the key is.
      const label = result
        ? result.entry?.title ?? t("collection.unknownEntry")
        : "…";
      filters.push({
        dimension: "entry",
        label: t("collection.filters.entry"),
        icon: BookOpen,
        options: [
          {
            key: view.entry,
            label,
            count: counts?.entry ?? uncounted,
            selected: true,
            change: { entry: view.entry },
          },
        ],
        clear: { entry: undefined },
        inMenu: false,
        active: { label },
      });
    }

    // The Overview's Needs attention links narrow to what one kind lacks.
    if (view.without) {
      const label = t(`collection.without.${view.without}`);
      filters.push({
        dimension: "without",
        label: t("collection.filters.without"),
        icon: CircleAlert,
        options: [
          {
            key: view.without,
            label,
            count: result?.total ?? 0,
            selected: true,
            change: { without: view.without },
          },
        ],
        clear: { without: undefined },
        inMenu: false,
        active: { label },
      });
    }

    // Owned is the default, so only the sold view shows as an active filter.
    filters.push({
      dimension: "status",
      label: t("collection.filters.status"),
      icon: CircleCheck,
      options: [
        {
          key: "owned",
          label: t("collection.statuses.owned"),
          count: counts?.statuses.owned ?? uncounted,
          selected: view.status === undefined,
          change: { status: undefined },
        },
        {
          key: "sold",
          label: t("collection.statuses.sold"),
          count: counts?.statuses.sold ?? uncounted,
          selected: view.status === "sold",
          change: { status: "sold" },
        },
      ],
      clear: { status: undefined },
      ...(view.status === "sold"
        ? { active: { label: t("collection.statuses.sold") } }
        : { active: undefined }),
    });

    return filters.map((filter) => {
      if (filter.dimension === "status" || filter.active)
        return { ...filter, counting };
      const chosen = filter.options.find((option) => option.selected);
      return {
        ...filter,
        counting,
        ...(chosen && { active: { label: chosen.label, icon: chosen.icon } }),
      };
    });
  }, [result, counts, view, t, locale, format, labels, albums]);
}
