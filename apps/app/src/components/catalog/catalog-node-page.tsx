"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { catalogPageSize } from "@coinslite/backend/convex/catalog/fields";
import { isSet } from "@coinslite/backend/convex/catalog/setRules";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Coins,
  Flag,
  ListChecks,
  ListOrdered,
  ListTree,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type * as React from "react";
import { CatalogEntryDetail } from "./catalog-entry-detail";
import { CatalogHeader, type Crumb } from "./catalog-header";
import {
  type CatalogLevel,
  type SetScope,
  catalogHref,
  catalogNodeHref,
  levelFrom,
  levelHref,
  setHref,
} from "./catalog-levels";
import {
  CatalogRow,
  EmptyLevel,
  EntryRows,
  IconTile,
  ListHeading,
  RowCount,
  RowsSkeleton,
} from "./catalog-rows";
import { useCatalogFormat } from "./use-catalog-format";

type CatalogNode = NonNullable<
  FunctionReturnType<typeof api.catalog.browse.node>
>;
type GroupNode = Exclude<CatalogNode, { kind: "entry" }>;

/**
 * Any level below the top of the Catalog, by the key in the URL: a Catalog
 * entry's detail, or a country, Theme or grouping with what sits below it.
 * Reads the URL, so its page renders it inside Suspense.
 */
export function CatalogNodePage({ actions }: { actions?: React.ReactNode }) {
  const t = useI18n();
  const { nodeTitle } = useCatalogFormat();
  const { key } = useParams<{ key: string }>();
  const node = useQuery(api.catalog.browse.node, { key });

  if (node === undefined) {
    return (
      <>
        <CatalogHeader crumbs={[]} title="" actions={actions} />
        <RowsSkeleton />
      </>
    );
  }
  if (node === null) {
    return (
      <>
        <CatalogHeader
          crumbs={[]}
          title={t("catalog.notFoundTitle")}
          actions={actions}
        />
        <div className="p-4">
          <EmptyState
            icon={
              <SearchX
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalog.notFoundTitle")}
            description={t("catalog.notFound")}
            action={
              <Link
                href={catalogHref}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("catalog.backToCatalog")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const crumbs = node.ancestors.map((ancestor) => ({
    href: catalogNodeHref(ancestor.key),
    label: nodeTitle(ancestor),
  }));
  if (node.kind === "entry") {
    return (
      <CatalogEntryDetail entry={node} crumbs={crumbs} actions={actions} />
    );
  }
  return <CatalogGroup node={node} crumbs={crumbs} actions={actions} />;
}

/** A country, Theme or grouping, at the level the URL asks for. */
function CatalogGroup({
  node,
  crumbs,
  actions,
}: {
  node: GroupNode;
  crumbs: Crumb[];
  actions?: React.ReactNode;
}) {
  const t = useI18n();
  const { nodeTitle } = useCatalogFormat();
  const level = levelFrom(useSearchParams(), node);
  const denominationLabel = (denomination: string | null) =>
    denomination ?? t("catalog.noDenomination");
  const nodeCrumb = {
    href: levelHref(node.key, { view: "denominations" }),
    label: nodeTitle(node),
  };

  if (level.view === "series") {
    return (
      <>
        <CatalogHeader
          crumbs={[...crumbs, nodeCrumb]}
          title={denominationLabel(level.denomination)}
          actions={
            <>
              <DenominationSetLink
                nodeKey={node.key}
                denomination={level.denomination}
              />
              {actions}
            </>
          }
        />
        <SeriesList nodeKey={node.key} denomination={level.denomination} />
      </>
    );
  }
  if (level.view === "entries") {
    return (
      <>
        <CatalogHeader
          crumbs={[
            ...crumbs,
            nodeCrumb,
            {
              href: levelHref(node.key, {
                view: "series",
                denomination: level.denomination,
              }),
              label: denominationLabel(level.denomination),
            },
          ]}
          title={level.series ?? t("catalog.noSeries")}
          actions={
            <>
              <SeriesSetLink
                nodeKey={node.key}
                denomination={level.denomination}
                series={level.series}
              />
              {actions}
            </>
          }
        />
        <SeriesEntries
          nodeKey={node.key}
          denomination={level.denomination}
          series={level.series}
        />
      </>
    );
  }
  return (
    <>
      <CatalogHeader
        crumbs={crumbs}
        title={nodeTitle(node)}
        actions={
          <>
            {isSet(node.entryCount) && <ViewAsSet scope={{ key: node.key }} />}
            {actions}
          </>
        }
      />
      {node.countryNode && <BrowseBy nodeKey={node.key} level={level} />}
      {level.view === "denominations" ? (
        <DenominationList nodeKey={node.key} />
      ) : (
        <GroupContents node={node} />
      )}
    </>
  );
}

/** Within a country: walk its groupings, or go by denomination. Each is a link, so each view has its URL. */
function BrowseBy({
  nodeKey,
  level,
}: { nodeKey: string; level: CatalogLevel }) {
  const t = useI18n();
  const views = [
    { view: "groups", label: t("catalog.byGroup") },
    { view: "denominations", label: t("catalog.byDenomination") },
  ] as const;
  return (
    <div className="flex h-10 items-center border-b px-4">
      <nav
        aria-label={t("catalog.browseBy")}
        className="inline-flex rounded-md border bg-muted p-0.5 text-[13px]"
      >
        {views.map(({ view, label }) => (
          <Link
            key={view}
            href={levelHref(nodeKey, { view })}
            aria-current={level.view === view ? "page" : undefined}
            className="flex h-6 items-center rounded-[calc(var(--radius)-3px)] px-2.5 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card aria-[current=page]:text-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Opens a grouping as a Set: every entry below it, with how complete it is. */
function ViewAsSet({ scope }: { scope: SetScope }) {
  const t = useI18n();
  return (
    <Button asChild variant="ghost" size="xs">
      <Link href={setHref(scope)}>
        <ListChecks strokeWidth={1.75} aria-hidden="true" />
        {t("sets.viewAsSet")}
      </Link>
    </Button>
  );
}

/**
 * "View as Set" for a denomination, once its series show it has more than
 * one entry: several series, or one over several years.
 */
function DenominationSetLink({
  nodeKey,
  denomination,
}: {
  nodeKey: string;
  denomination: string | null;
}) {
  const rows = useQuery(api.catalog.browse.series, {
    key: nodeKey,
    denomination,
  });
  const [only] = rows ?? [];
  const several =
    rows !== undefined &&
    (rows.length > 1 ||
      (only !== undefined && only.firstYear !== only.lastYear));
  return several ? <ViewAsSet scope={{ key: nodeKey, denomination }} /> : null;
}

/** "View as Set" for one series of a denomination with more than one entry. */
function SeriesSetLink({
  nodeKey,
  denomination,
  series,
}: {
  nodeKey: string;
  denomination: string | null;
  series: string | null;
}) {
  const { results } = usePaginatedQuery(
    api.catalog.browse.seriesEntries,
    { key: nodeKey, denomination, series },
    { initialNumItems: catalogPageSize },
  );
  return results.length > 1 ? (
    <ViewAsSet scope={{ key: nodeKey, denomination, series }} />
  ) : null;
}

/** "Show more" under a list that has another page. */
function ShowMore({ onClick }: { onClick: () => void }) {
  const t = useI18n();
  return (
    <div className="p-2">
      <Button variant="ghost" size="xs" onClick={onClick}>
        {t("catalog.showMore")}
      </Button>
    </div>
  );
}

/** The groupings right below a node (a Theme's countries), then its own entries. */
function GroupContents({ node }: { node: GroupNode }) {
  const t = useI18n();
  const { nodeTitle } = useCatalogFormat();
  const { results, status, loadMore } = usePaginatedQuery(
    api.catalog.browse.entries,
    { key: node.key },
    { initialNumItems: catalogPageSize },
  );
  const loading = status === "LoadingFirstPage";
  const hasGroupings = node.groupings.length > 0;

  if (!hasGroupings && loading) return <RowsSkeleton />;
  if (!hasGroupings && results.length === 0) {
    return <EmptyLevel>{t("catalog.nothingHere")}</EmptyLevel>;
  }
  const headed = hasGroupings && results.length > 0;
  return (
    <>
      <ul className="divide-y border-b">
        {headed && <ListHeading>{t("catalog.groupsHeading")}</ListHeading>}
        {node.groupings.map((grouping) => (
          <CatalogRow
            key={grouping.key}
            href={catalogNodeHref(grouping.key)}
            tile={<IconTile icon={node.kind === "theme" ? Flag : ListTree} />}
            title={nodeTitle(grouping)}
            end={
              <RowCount
                label={t("catalog.entryCount")}
                count={grouping.entryCount}
              />
            }
          />
        ))}
        {headed && <ListHeading>{t("catalog.entriesHeading")}</ListHeading>}
        <EntryRows entries={results} />
      </ul>
      {status === "CanLoadMore" && (
        <ShowMore onClick={() => loadMore(catalogPageSize)} />
      )}
    </>
  );
}

/** A country's denominations, smallest face value first. */
function DenominationList({ nodeKey }: { nodeKey: string }) {
  const t = useI18n();
  const rows = useQuery(api.catalog.browse.denominations, { key: nodeKey });
  if (rows === undefined) return <RowsSkeleton />;
  if (rows.length === 0) {
    return <EmptyLevel>{t("catalog.noEntries")}</EmptyLevel>;
  }
  return (
    <ul className="divide-y border-b">
      {rows.map(({ denomination, seriesCount }) => (
        <CatalogRow
          key={denomination ?? ""}
          href={levelHref(nodeKey, { view: "series", denomination })}
          tile={<IconTile icon={Coins} />}
          title={denomination ?? t("catalog.noDenomination")}
          facts={t("catalog.seriesCount", { count: seriesCount })}
        />
      ))}
    </ul>
  );
}

/** A denomination's series, earliest first. */
function SeriesList({
  nodeKey,
  denomination,
}: {
  nodeKey: string;
  denomination: string | null;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const rows = useQuery(api.catalog.browse.series, {
    key: nodeKey,
    denomination,
  });
  if (rows === undefined) return <RowsSkeleton />;
  if (rows.length === 0) {
    return <EmptyLevel>{t("catalog.noEntries")}</EmptyLevel>;
  }
  return (
    <ul className="divide-y border-b">
      {rows.map(({ series, firstYear, lastYear }) => (
        <CatalogRow
          key={series ?? ""}
          href={levelHref(nodeKey, { view: "entries", denomination, series })}
          tile={<IconTile icon={ListOrdered} />}
          title={series ?? t("catalog.noSeries")}
          facts={catalogFormat.years(firstYear, lastYear)}
        />
      ))}
    </ul>
  );
}

/** The entries of one series of a denomination, by year. */
function SeriesEntries({
  nodeKey,
  denomination,
  series,
}: {
  nodeKey: string;
  denomination: string | null;
  series: string | null;
}) {
  const t = useI18n();
  const { results, status, loadMore } = usePaginatedQuery(
    api.catalog.browse.seriesEntries,
    { key: nodeKey, denomination, series },
    { initialNumItems: catalogPageSize },
  );
  if (status === "LoadingFirstPage") return <RowsSkeleton />;
  if (results.length === 0) {
    return <EmptyLevel>{t("catalog.noEntries")}</EmptyLevel>;
  }
  return (
    <>
      <ul className="divide-y border-b">
        <EntryRows entries={results} />
      </ul>
      {status === "CanLoadMore" && (
        <ShowMore onClick={() => loadMore(catalogPageSize)} />
      )}
    </>
  );
}
