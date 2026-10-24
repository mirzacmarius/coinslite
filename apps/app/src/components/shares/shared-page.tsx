"use client";

import { AlbumDot } from "@/components/albums/album-colours";
import {
  EmptyLevel,
  EntryTile,
  RowsSkeleton,
} from "@/components/catalog/catalog-rows";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import { useGradeLabels } from "@/components/items/grade-labels";
import { ItemThumbnail } from "@/components/items/item-thumbnail";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  isShareToken,
  shareLimits,
} from "@coinslite/backend/convex/shares/rules";
import type { HomeCurrency } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { Progress } from "@coinslite/ui/progress";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Link2Off } from "lucide-react";
import { useParams } from "next/navigation";
import type * as React from "react";

type Shared = NonNullable<FunctionReturnType<typeof api.shares.view>>;
type SharedAlbum = Extract<Shared, { kind: "album" }>;
type SharedSet = Extract<Shared, { kind: "set" }>;
type SharedGroup = SharedSet["groups"][number];

/** The shared page while the link is looked up: a heading, then rows. */
export function SharedPageSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex flex-col gap-2 border-b px-4 py-5">
        <span className="h-3 w-24 animate-pulse rounded bg-muted" />
        <span className="h-6 w-56 animate-pulse rounded bg-muted" />
        <span className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <RowsSkeleton />
    </div>
  );
}

/**
 * What a share link opens (spec §8): the Album or the Set its token names,
 * read-only, or a word that the page is no longer shared. Reads the URL, so
 * its page renders it inside Suspense.
 */
export function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const valid = isShareToken(token);
  const shared = useQuery(api.shares.view, valid ? { token } : "skip");
  if (valid && shared === undefined) return <SharedPageSkeleton />;
  if (!shared) return <SharedGone />;
  return shared.kind === "album" ? (
    <SharedAlbumView shared={shared} token={token} />
  ) : (
    <SharedSetView shared={shared} />
  );
}

/** A link that opens nothing: never shared, stopped, or mistyped. */
function SharedGone() {
  const t = useI18n();
  return (
    <div className="p-4 pt-10">
      <EmptyState
        icon={
          <Link2Off className="size-4" strokeWidth={1.75} aria-hidden="true" />
        }
        title={t("shared.goneTitle")}
        description={t("shared.goneDescription")}
      />
    </div>
  );
}

/** What is shared: its kind, name and description, then who shares it and the figures. */
function SharedHeader({
  kind,
  lead,
  title,
  description,
  facts,
}: {
  kind: string;
  lead?: React.ReactNode;
  title: string;
  description?: string;
  facts: string[];
}) {
  return (
    <header className="flex items-start gap-3 border-b px-4 py-5">
      {lead}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{kind}</p>
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {facts.length > 0 && (
          <p className="text-ui text-muted-foreground">{facts.join(" · ")}</p>
        )}
      </div>
    </header>
  );
}

const present = (fact: string | false | undefined): fact is string =>
  Boolean(fact);

/** A shared Album: its name, who shares it, how many Items and what they're worth when shown, then the Items. */
function SharedAlbumView({
  shared,
  token,
}: {
  shared: SharedAlbum;
  token: string;
}) {
  const t = useI18n();
  const format = useFormatters();
  const facts = [
    shared.sharedBy !== undefined && t("shared.by", { name: shared.sharedBy }),
    t("shared.items", { count: shared.itemCount }),
    shared.marketValue !== null &&
      `${t("shared.marketValue")} ${format.money(
        shared.marketValue,
        shared.currency,
      )}`,
  ].filter(present);
  return (
    <>
      <SharedHeader
        kind={t("shared.album")}
        lead={
          <span className="flex h-7 shrink-0 items-center">
            <AlbumDot colour={shared.colour} className="size-3" />
          </span>
        }
        title={shared.name}
        description={shared.description}
        facts={facts}
      />
      <SharedItems
        token={token}
        showValues={shared.showValues}
        currency={shared.currency}
      />
    </>
  );
}

/** The Items of a shared Album, newest first, a page at a time; each row shows what shares/rules.ts allows. */
function SharedItems({
  token,
  showValues,
  currency,
}: {
  token: string;
  showValues: boolean;
  currency: HomeCurrency;
}) {
  const t = useI18n();
  const format = useFormatters();
  const labels = useGradeLabels();
  const { results, status, loadMore } = usePaginatedQuery(
    api.shares.items,
    { token },
    { initialNumItems: shareLimits.pageSize },
  );
  if (status === "LoadingFirstPage") return <RowsSkeleton />;
  if (results.length === 0) {
    return <EmptyLevel>{t("shared.noItems")}</EmptyLevel>;
  }
  return (
    <>
      <ul className="divide-y border-b">
        {results.map((item) => {
          const facts = [
            item.year,
            item.denomination,
            item.country && format.country(item.country),
            item.grade &&
              item.gradingScale &&
              labels.grade(item.gradingScale, item.grade, item.strike),
          ].filter(Boolean);
          return (
            <li
              key={item.id}
              className="flex min-h-11 items-center gap-3 px-4 py-1.5"
            >
              <ItemThumbnail type={item.type} url={item.thumbnailUrl} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-ui font-medium">
                  {item.title}
                </span>
                {facts.length > 0 && (
                  <span className="truncate text-xs text-muted-foreground">
                    {facts.join(" · ")}
                  </span>
                )}
              </span>
              {showValues && item.marketValue !== undefined && (
                <span className="shrink-0 text-ui tabular-nums">
                  {format.money(item.marketValue * item.quantity, currency)}
                </span>
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                <span className="sr-only">{t("items.quantity")} </span>×
                {item.quantity}
              </span>
            </li>
          );
        })}
      </ul>
      {status === "CanLoadMore" && (
        <div className="p-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => loadMore(shareLimits.pageSize)}
          >
            {t("items.showMore")}
          </Button>
        </div>
      )}
    </>
  );
}

/** A shared Set: where it sits in the Catalog, how complete it is, and its entries with the ones held marked. */
function SharedSetView({ shared }: { shared: SharedSet }) {
  const t = useI18n();
  const format = useFormatters();
  const catalogFormat = useCatalogFormat();
  const title = catalogFormat.nodeTitle({
    key: shared.key,
    title: shared.title,
    country: shared.country,
    countryNode: shared.countryNode,
  });
  const trail = shared.ancestors.map((ancestor) =>
    catalogFormat.nodeTitle(ancestor),
  );
  const facts = [
    shared.sharedBy !== undefined && t("shared.by", { name: shared.sharedBy }),
  ].filter(present);
  /** A sub-group's way down from the Set; a Theme's country by its name in the reader's language. */
  const groupLabel = ({ titles, country }: SharedGroup) => {
    const [first, ...rest] = titles;
    if (first === undefined) return title;
    return [country ? format.country(country) : first, ...rest].join(" › ");
  };
  return (
    <>
      <SharedHeader
        kind={t("shared.set")}
        title={title}
        description={trail.length > 0 ? trail.join(" › ") : undefined}
        facts={facts}
      />
      <div className="flex min-h-10 items-center gap-2 border-b px-4 py-1.5 text-ui">
        <span className="font-medium tabular-nums">
          {t("shared.completion", {
            held: format.number(shared.held),
            total: format.number(shared.total),
          })}
        </span>
        <Progress
          value={shared.held}
          max={shared.total}
          label={t("sets.completionLabel")}
          className="w-24"
        />
        <span className="text-xs tabular-nums text-muted-foreground">
          {format.number(shared.percent / 100, { style: "percent" })}
        </span>
      </div>
      <div className="border-b">
        {shared.groups.map((group) => (
          <section key={group.key} aria-label={groupLabel(group)}>
            {shared.groups.length > 1 && (
              <h2 className="flex h-8 items-center justify-between gap-2 border-b bg-background px-4 text-xs font-medium text-muted-foreground">
                <span className="truncate">{groupLabel(group)}</span>
                <span className="shrink-0 tabular-nums">
                  {t("sets.groupCompletion", {
                    held: group.entries.filter((entry) => entry.held > 0)
                      .length,
                    total: group.entries.length,
                  })}
                </span>
              </h2>
            )}
            <ul className="divide-y">
              {group.entries.map((entry) => {
                const suffix = catalogFormat.strikeSuffix(entry);
                const entryFacts = catalogFormat
                  .rowFacts(entry, shared.country)
                  .join(" · ");
                return (
                  <li
                    key={entry.key}
                    className="flex min-h-11 items-center gap-3 px-4 py-1.5"
                  >
                    <EntryTile entry={entry} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-ui font-medium">
                        {entry.title}
                        {suffix && (
                          <span className="font-normal text-muted-foreground">
                            {" · "}
                            {suffix}
                          </span>
                        )}
                      </span>
                      {entryFacts && (
                        <span className="truncate text-xs text-muted-foreground">
                          {entryFacts}
                        </span>
                      )}
                      {entry.imageCredit && (
                        <span className="truncate text-xs text-muted-foreground">
                          {`${t("catalog.imageCredit")} · ${catalogFormat.credit(entry.imageCredit)}`}
                        </span>
                      )}
                    </span>
                    <HeldMark held={entry.held} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** How many of an entry the sharer holds; nothing when none. */
function HeldMark({ held }: { held: number }) {
  const t = useI18n();
  const format = useFormatters();
  if (held === 0) return null;
  const count = format.number(held);
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums">
      <Check
        className="size-3.5 text-link"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="sr-only">{t("shared.held", { count })}</span>
      <span aria-hidden="true">{count}</span>
    </span>
  );
}
