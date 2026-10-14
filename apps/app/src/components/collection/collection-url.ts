"use client";

import {
  type CollectionSort,
  type CollectionView,
  type Origin,
  type PageSize,
  collectionSorts,
  defaultSort,
  origins,
  searchLimit,
} from "@coinslite/backend/convex/collection/view";
import {
  type AttentionKind,
  attentionKinds,
} from "@coinslite/backend/convex/items/attention";
import {
  type GradingScale,
  type ItemType,
  gradingScaleIds,
  isGrade,
} from "@coinslite/backend/convex/items/grades";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { itemTypes } from "../items/item-fields";

/**
 * The Collection view lives in the URL, so any view can be bookmarked or
 * shared: ?q=krone&type=coin&bullion=1&origin=own&country=NO
 * &denomination=1%20krone&grade=european:XF&album=…&status=sold&sort=price&page=2.
 * ?addTo=<Album> picks Items to add to that Album: the view leaves out the
 * Items already in it. ?entry=<key> shows the Items made from one Catalog
 * entry, and ?without=marketValue|photo|grade the Items the Overview says
 * need attention for that.
 * Defaults are left out. Anything that doesn't parse is ignored.
 */

const oneOf = <T extends string>(values: readonly T[], value: string | null) =>
  values.find((candidate) => candidate === value);

export function readCollectionUrl(params: URLSearchParams) {
  const view: CollectionView = {};
  const search = params.get("q")?.slice(0, searchLimit);
  if (search?.trim()) view.search = search;
  const type = oneOf<ItemType>(itemTypes, params.get("type"));
  if (type) view.type = type;
  if (params.get("bullion") === "1") view.bullionOnly = true;
  const origin = oneOf<Origin>(origins, params.get("origin"));
  if (origin) view.origin = origin;
  const country = params.get("country");
  if (country && /^[A-Za-z]{2}$/.test(country))
    view.country = country.toUpperCase();
  const denomination = params.get("denomination")?.trim();
  if (denomination) view.denomination = denomination.slice(0, searchLimit);
  const [scale, ...rest] = params.get("grade")?.split(":") ?? [];
  const gradingScale = oneOf<GradingScale>(gradingScaleIds, scale ?? null);
  const grade = rest.join(":");
  if (gradingScale && isGrade(gradingScale, grade))
    view.grade = { gradingScale, grade };
  const album = params.get("album");
  if (album) view.album = album;
  const addTo = params.get("addTo");
  if (addTo) view.notInAlbum = addTo;
  const entry = params.get("entry")?.trim();
  if (entry) view.entry = entry.slice(0, searchLimit);
  const without = oneOf<AttentionKind>(attentionKinds, params.get("without"));
  if (without) view.without = without;
  if (params.get("status") === "sold") view.status = "sold";
  const sort = oneOf<CollectionSort>(collectionSorts, params.get("sort"));
  if (sort && sort !== defaultSort) view.sort = sort;
  const page = Number(params.get("page"));
  return { view, page: Number.isSafeInteger(page) && page > 1 ? page : 1 };
}

/** Marks an Item's URL as opened from a Collection view, even the default one. */
const fromView = "view";

/**
 * An Item's page, opened from a Collection view: the URL carries the view
 * (without its page), so the Item page can move through it.
 */
export function itemInViewHref(itemId: string, view: CollectionView) {
  const params = writeCollectionUrl(view, 1);
  params.set(fromView, "1");
  return `/collection/${itemId}?${params}`;
}

/**
 * An Item's page, or with `edit` its Edit Item page, keeping what the URL
 * it's opened from carries (`query`, an Item URL's own): the Collection view
 * it came from, if any.
 */
export function itemPageHref(itemId: string, query: string, edit = false) {
  const path = `/collection/${itemId}${edit ? "/edit" : ""}`;
  return query ? `${path}?${query}` : path;
}

/** The Collection view an Item's URL carries; undefined when it was opened from elsewhere. */
export function viewOfItemUrl(params: URLSearchParams) {
  return params.get(fromView) === "1"
    ? readCollectionUrl(params).view
    : undefined;
}

/** The Collection showing a view, from its first page unless told otherwise. */
export function collectionHref(view: CollectionView, page = 1) {
  const query = writeCollectionUrl(view, page).toString();
  return query ? `/collection?${query}` : "/collection";
}

/**
 * Where the Item page goes once its Item is deleted: back to the Collection
 * view its URL carries, at the page that showed the Item (`place`: where it
 * stood in the view, from 0, and how many the view held with it), or the
 * page before when the Item was alone on the last one. Without a known
 * place, the view's first page; without a view, the Collection.
 */
export function hrefAfterDeleting(
  itemParams: URLSearchParams,
  place: { position: number; total: number } | null | undefined,
  pageSize: PageSize,
) {
  const view = viewOfItemUrl(itemParams);
  if (!view) return "/collection";
  if (!place) return collectionHref(view);
  const pagesLeft = Math.ceil((place.total - 1) / pageSize);
  const page = Math.min(Math.floor(place.position / pageSize) + 1, pagesLeft);
  return collectionHref(view, page);
}

/** The Collection narrowed to the Items made from one Catalog entry. */
export function entryItemsHref(entryKey: string) {
  return collectionHref({ entry: entryKey });
}

export function writeCollectionUrl(view: CollectionView, page: number) {
  const params = new URLSearchParams();
  if (view.search?.trim()) params.set("q", view.search);
  if (view.type) params.set("type", view.type);
  if (view.bullionOnly) params.set("bullion", "1");
  if (view.origin) params.set("origin", view.origin);
  if (view.country) params.set("country", view.country);
  if (view.denomination) params.set("denomination", view.denomination);
  if (view.grade)
    params.set("grade", `${view.grade.gradingScale}:${view.grade.grade}`);
  if (view.album) params.set("album", view.album);
  if (view.notInAlbum) params.set("addTo", view.notInAlbum);
  if (view.entry) params.set("entry", view.entry);
  if (view.without) params.set("without", view.without);
  if (view.status) params.set("status", view.status);
  if (view.sort && view.sort !== defaultSort) params.set("sort", view.sort);
  if (page > 1) params.set("page", String(page));
  return params;
}

/**
 * The Collection view in the URL, and ways to change it. Changes go through
 * the browser's history, so Back undoes them and nothing reloads; changing
 * the view starts again at its first page. Reads the URL, so it must sit
 * inside Suspense (ADR 0004).
 */
export function useCollectionUrl() {
  const params = useSearchParams();
  const { view, page } = useMemo(
    () => readCollectionUrl(new URLSearchParams(params.toString())),
    [params],
  );

  const go = useCallback(
    (next: CollectionView, nextPage: number, history: "push" | "replace") => {
      const query = writeCollectionUrl(next, nextPage).toString();
      const url = query ? `?${query}` : window.location.pathname;
      if (history === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [],
  );

  return {
    view,
    page,
    /** Changes part of the view; typing in search replaces the history entry. */
    update: useCallback(
      (change: Partial<CollectionView>, history: "push" | "replace" = "push") =>
        go({ ...view, ...change }, 1, history),
      [go, view],
    ),
    goToPage: useCallback(
      (nextPage: number) => go(view, nextPage, "push"),
      [go, view],
    ),
    /** Clears the search and every filter, keeping the sort and the Album being added to. */
    clearAll: useCallback(
      () => go({ sort: view.sort, notInAlbum: view.notInAlbum }, 1, "push"),
      [go, view.sort, view.notInAlbum],
    ),
  };
}
