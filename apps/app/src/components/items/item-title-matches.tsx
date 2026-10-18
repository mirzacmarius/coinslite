"use client";

import {
  type CatalogSearchHit,
  useHitFacts,
} from "@/components/catalog/catalog-search";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import { useCatalogVisible } from "@/components/catalog/use-catalog-visible";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { searchQueryWords } from "@coinslite/backend/convex/catalog/searchWords";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "convex/react";
import { Banknote, BookOpen, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isCatalogType } from "./item-fields";
import type { ItemForm } from "./use-item-form";

/** How long typing pauses before the search runs, as in the Catalog search. */
const pause = 250;

/** Matches shown, at most: the best ones. */
const shown = 3;

/**
 * Under a new Item's title, while it's typed: the Catalog entries of the
 * Item's type that match it, best first. Picking one links the form to it
 * and fills its title and facts, as "Pick from the Catalog" does. Nothing
 * shows without a match, or where the Catalog is hidden.
 */
export function TitleCatalogMatches({
  form,
  onPick,
}: {
  form: ItemForm;
  onPick: (key: string) => void;
}) {
  const t = useI18n();
  const catalogVisible = useCatalogVisible();
  const title = useSelector(form.store, (state) => state.values.title);
  const type = useSelector(form.store, (state) => state.values.type);
  // What's searched for: the title, once typing pauses.
  const [query, setQuery] = useState(title);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(title), pause);
    return () => clearTimeout(timer);
  }, [title]);
  const searching =
    catalogVisible === true &&
    isCatalogType(type) &&
    searchQueryWords(title).length > 0 &&
    searchQueryWords(query).length > 0;
  const found = useQuery(
    api.catalog.search.find,
    searching && isCatalogType(type)
      ? { text: query, itemType: type, entriesOnly: true }
      : "skip",
  );
  // While the next search's results load, keep showing the last ones.
  const last = useRef<CatalogSearchHit[]>([]);
  if (found !== undefined)
    last.current = found.groups.flatMap((group) => group.nodes).slice(0, shown);
  const hits = searching ? last.current : [];
  if (hits.length === 0) return null;

  return (
    <section
      aria-label={t("items.titleMatches")}
      className="flex flex-col gap-0.5 rounded-md border bg-muted/40 p-1"
    >
      <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-xs text-muted-foreground">
        <BookOpen className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        {t("items.titleMatches")}
      </p>
      {hits.map((hit) => (
        <MatchRow key={hit._id} hit={hit} onPick={onPick} />
      ))}
    </section>
  );
}

/** A matching entry: its title, country and facts, and Use. */
function MatchRow({
  hit,
  onPick,
}: {
  hit: CatalogSearchHit;
  onPick: (key: string) => void;
}) {
  const t = useI18n();
  const { country } = useFormatters();
  const { nodeTitle } = useCatalogFormat();
  const facts = useHitFacts(hit);
  const Icon = hit.itemType === "banknote" ? Banknote : Coins;
  const context = [hit.country && country(hit.country), facts]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={() => onPick(hit.key)}
      className="group flex h-8 min-w-0 items-center gap-2 rounded px-2 text-left text-ui outline-none transition-colors duration-100 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 shrink truncate font-medium">
        {nodeTitle(hit)}
      </span>
      {context && (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {context}
        </span>
      )}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground group-hover:text-foreground">
        {t("items.titleMatchUse")}
      </span>
    </button>
  );
}
