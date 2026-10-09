"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  opensMissingOnly,
  setLimits,
} from "@coinslite/backend/convex/catalog/setRules";
import { Button } from "@coinslite/ui/button";
import { Checkbox } from "@coinslite/ui/checkbox";
import { EmptyState } from "@coinslite/ui/empty-state";
import { Progress } from "@coinslite/ui/progress";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { toast } from "@coinslite/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ChevronRight, ListChecks, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  BulkAddBar,
  DuplicatesSwitch,
  isAddShortcut,
  useBulkAdd,
} from "./bulk-add";
import { CatalogHeader, type Crumb } from "./catalog-header";
import {
  type SetScope,
  catalogHref,
  catalogNodeHref,
  levelHref,
  setScopeFrom,
} from "./catalog-levels";
import {
  EmptyLevel,
  EntryTile,
  HeldCount,
  RowsSkeleton,
  useOwnCountry,
} from "./catalog-rows";
import { type CatalogEntryRow, useCatalogFormat } from "./use-catalog-format";
import { useEntrySelection } from "./use-entry-selection";

type SetResult = NonNullable<FunctionReturnType<typeof api.catalog.sets.get>>;
type OpenSet = Exclude<SetResult, { tooLarge: true }>;
type SetGroup = OpenSet["groups"][number];

/**
 * A Set (spec 6.4), by the URL: every Catalog entry below a grouping, or on
 * a country's denomination path, with how complete it is. Entries the person
 * is missing can be selected, several or all at once, and added to the
 * Collection in one go. Reads the URL, so its page renders it inside Suspense.
 */
export function CatalogSetPage({ actions }: { actions?: React.ReactNode }) {
  const t = useI18n();
  const { key } = useParams<{ key: string }>();
  const params = useSearchParams();
  const scope = useMemo(() => setScopeFrom(key, params), [key, params]);
  const set = useQuery(api.catalog.sets.get, scope);
  const crumbs = useSetCrumbs(scope, set ?? undefined);

  if (set === undefined) {
    return (
      <>
        <CatalogHeader crumbs={[]} title="" actions={actions} />
        <RowsSkeleton />
      </>
    );
  }
  if (set === null || "tooLarge" in set) {
    return (
      <>
        <CatalogHeader
          crumbs={crumbs}
          title={t("sets.title")}
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
            title={t(set ? "sets.tooLargeTitle" : "sets.notASetTitle")}
            description={
              set
                ? t("sets.tooLarge", { limit: setLimits.entries })
                : t("sets.notASet")
            }
            action={
              <Link
                href={set ? catalogNodeHref(set.key) : catalogHref}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {set
                  ? t("sets.browse", { title: set.title })
                  : t("catalog.backToCatalog")}
              </Link>
            }
          />
        </div>
      </>
    );
  }
  return <SetView set={set} scope={scope} crumbs={crumbs} actions={actions} />;
}

/** The levels above a Set, down to the grouping it's of, for the header. */
function useSetCrumbs(
  scope: SetScope,
  set: Pick<SetResult, "title" | "ancestors"> | undefined,
): Crumb[] {
  const t = useI18n();
  if (!set) return [];
  const crumbs: Crumb[] = set.ancestors.map((ancestor) => ({
    href: catalogNodeHref(ancestor.key),
    label: ancestor.title,
  }));
  const { key, denomination, series } = scope;
  if (denomination === undefined) {
    return [...crumbs, { href: catalogNodeHref(key), label: set.title }];
  }
  crumbs.push({
    href: levelHref(key, { view: "denominations" }),
    label: set.title,
  });
  crumbs.push({
    href: levelHref(key, { view: "series", denomination }),
    label: denomination ?? t("catalog.noDenomination"),
  });
  if (series !== undefined) {
    crumbs.push({
      href: levelHref(key, { view: "entries", denomination, series }),
      label: series ?? t("catalog.noSeries"),
    });
  }
  return crumbs;
}

/** Whether a dialog (a picker, a confirmation) has the keyboard. */
const dialogOpen = () =>
  document.querySelector('[role=dialog][data-state="open"]') !== null;

function SetView({
  set,
  scope,
  crumbs,
  actions,
}: {
  set: OpenSet;
  scope: SetScope;
  crumbs: Crumb[];
  actions?: React.ReactNode;
}) {
  const t = useI18n();
  const selection = useEntrySelection();
  const [show, setShow] = useState<"missing" | "all">();
  const showing = show ?? (opensMissingOnly(set.total) ? "missing" : "all");
  const entries = useMemo(
    () => set.groups.flatMap((group) => group.entries),
    [set],
  );
  const missing = entries.filter((entry) => entry.held === 0);
  // What's added: the selected entries as the Set now has them, in its order.
  const keys = entries
    .filter(
      (entry) =>
        selection.isSelected(entry.key) && selection.canSelect(entry.held),
    )
    .map((entry) => entry.key);
  const bulk = useBulkAdd({
    keys,
    allowDuplicates: selection.allowDuplicates,
    onAdded: () => selection.clear(),
  });

  // Cmd/Ctrl+Enter adds what's selected; Esc lets go of it.
  const { add } = bulk;
  const { clear } = selection;
  const selecting = keys.length > 0;
  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpen()) return;
      if (isAddShortcut(event)) {
        event.preventDefault();
        void add();
      } else if (event.key === "Escape") {
        clear();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, add, clear]);

  const selectAllMissing = () => {
    const leftOut = selection.selectMany(missing);
    if (leftOut > 0) {
      toast(t("sets.selectedFirst", { limit: setLimits.bulkAdd }));
    }
  };

  const groups = set.groups
    .map((group) => ({
      ...group,
      shown:
        showing === "missing"
          ? group.entries.filter((entry) => entry.held === 0)
          : group.entries,
    }))
    .filter((group) => group.shown.length > 0);
  const ownLabel =
    scope.denomination === undefined ? set.title : t("catalog.noSeries");

  return (
    <>
      <CatalogHeader
        crumbs={crumbs}
        title={t("sets.title")}
        actions={actions}
      />
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-4 py-1.5">
        <Completion held={set.held} total={set.total} percent={set.percent} />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <SegmentedControl
            label={t("sets.show")}
            value={showing}
            onChange={setShow}
            options={[
              {
                value: "missing",
                label: t("sets.missing", { count: missing.length }),
              },
              { value: "all", label: t("sets.all", { count: set.total }) },
            ]}
          />
          <Button
            variant="ghost"
            size="xs"
            disabled={missing.length === 0}
            onClick={selectAllMissing}
          >
            <ListChecks strokeWidth={1.75} aria-hidden="true" />
            {t("sets.selectAllMissing")}
          </Button>
          <DuplicatesSwitch
            checked={selection.allowDuplicates}
            onCheckedChange={selection.setAllowDuplicates}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyLevel>
          {t("sets.nothingMissing")}{" "}
          <Button variant="ghost" size="xs" onClick={() => setShow("all")}>
            {t("sets.showAll")}
          </Button>
        </EmptyLevel>
      ) : (
        <div className="border-b">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-label={
                group.titles.length > 0 ? group.titles.join(" › ") : ownLabel
              }
            >
              {set.groups.length > 1 && (
                <GroupHeading
                  group={group}
                  label={
                    group.titles.length > 0
                      ? group.titles.join(" › ")
                      : ownLabel
                  }
                />
              )}
              <ul className="divide-y">
                {group.shown.map((entry) => (
                  <SetEntryRow
                    key={entry.key}
                    entry={entry}
                    selected={selection.isSelected(entry.key)}
                    selectable={selection.canSelect(entry.held)}
                    onToggle={() => selection.toggle(entry)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selecting && (
        <BulkAddBar bulk={bulk} onClear={selection.clear} variant="floating" />
      )}
    </>
  );
}

/** Held / total, as a bar and a percentage. */
function Completion({
  held,
  total,
  percent,
}: {
  held: number;
  total: number;
  percent: number;
}) {
  const t = useI18n();
  const format = useFormatters();
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="font-medium tabular-nums">
        {t("sets.completion", {
          held: format.number(held),
          total: format.number(total),
        })}
      </span>
      <Progress
        value={held}
        max={total}
        label={t("sets.completionLabel")}
        className="w-24"
      />
      <span className="text-xs tabular-nums text-muted-foreground">
        {format.number(percent / 100, { style: "percent" })}
      </span>
    </div>
  );
}

/** A sub-group's heading, sticking under the page header while its entries scroll by. */
function GroupHeading({
  group,
  label,
}: {
  group: SetGroup;
  label: string;
}) {
  const t = useI18n();
  const held = group.entries.filter((entry) => entry.held > 0).length;
  return (
    <h2 className="sticky top-10 z-10 flex h-8 items-center justify-between gap-2 border-b bg-background/95 px-4 text-xs font-medium text-muted-foreground backdrop-blur">
      <span className="truncate">{label}</span>
      <span className="shrink-0 tabular-nums">
        {t("sets.groupCompletion", {
          held,
          total: group.entries.length,
        })}
      </span>
    </h2>
  );
}

/**
 * One entry of a Set: a checkbox to select it (unless it's held and
 * duplicates aren't allowed), its picture, title and facts, how many the
 * person holds, and the way to its page.
 */
function SetEntryRow({
  entry,
  selected,
  selectable,
  onToggle,
}: {
  entry: CatalogEntryRow;
  selected: boolean;
  selectable: boolean;
  onToggle: () => void;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const ownCountry = useOwnCountry();
  const id = useId();
  const suffix = catalogFormat.strikeSuffix(entry);
  const facts = catalogFormat.rowFacts(entry, ownCountry).join(" · ");
  return (
    <li className="group flex min-h-11 items-center gap-3 px-4 py-1.5 transition-colors duration-100 hover:bg-muted has-[:focus-visible]:bg-muted">
      <Checkbox
        id={id}
        checked={selected && selectable}
        disabled={!selectable}
        onCheckedChange={onToggle}
      />
      <label
        htmlFor={id}
        className={
          selectable
            ? "flex min-w-0 flex-1 cursor-pointer items-center gap-3"
            : "flex min-w-0 flex-1 items-center gap-3"
        }
      >
        <EntryTile entry={entry} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">
            {entry.title}
            {suffix && (
              <span className="font-normal text-muted-foreground">
                {" · "}
                {suffix}
              </span>
            )}
          </span>
          {facts && (
            <span className="truncate text-xs text-muted-foreground">
              {facts}
            </span>
          )}
          {entry.imageCredit && (
            <span className="truncate text-xs text-muted-foreground">
              {`${t("catalog.imageCredit")} · ${catalogFormat.credit(entry.imageCredit)}`}
            </span>
          )}
        </span>
      </label>
      <HeldCount held={entry.held} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={catalogNodeHref(entry.key)}
            aria-label={t("sets.openEntry", { title: entry.title })}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent>{t("sets.openEntryHint")}</TooltipContent>
      </Tooltip>
    </li>
  );
}
