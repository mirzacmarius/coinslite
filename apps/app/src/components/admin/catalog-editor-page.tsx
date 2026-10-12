"use client";

import { catalogNodeHref } from "@/components/catalog/catalog-levels";
import { CatalogNodeDeleteDialog } from "@/components/catalog/catalog-node-delete-dialog";
import type { ParentNode } from "@/components/catalog/catalog-node-form";
import {
  CatalogNodeSheet,
  type NodeSheetTarget,
} from "@/components/catalog/catalog-node-sheet";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { IconButton } from "@coinslite/ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Banknote,
  BookOpen,
  ChevronRight,
  Coins,
  ExternalLink,
  FileSpreadsheet,
  Flag,
  Layers,
  ListTree,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useState } from "react";

type TreeNode = FunctionReturnType<
  typeof api.catalog.editor.children
>["page"][number];

/** Nodes a level loads at a time. */
const pageSize = 50;

/** What a row's actions open, provided once for the whole tree. */
type TreeActions = {
  add: (parent: ParentNode | null) => void;
  edit: (key: string) => void;
  remove: (node: { key: string; title: string }) => void;
};
const TreeActionsContext = createContext<TreeActions | null>(null);
const useTreeActions = () => useContext(TreeActionsContext) as TreeActions;

/**
 * The admins' Catalog editor: every node in a collapsible tree, where they
 * add countries and Themes, add below any of them, edit and delete. A
 * deletion or Item type change still running in the background shows on its
 * node, which can't be changed meanwhile, nor can anything below a node
 * being deleted. Everyone else finds nothing here; the backend refuses them
 * too.
 */
export function CatalogEditorPage() {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  // Each opening mounts the sheet afresh, so it starts from its node.
  const [sheet, setSheet] = useState<{
    target: NodeSheetTarget;
    session: number;
    open: boolean;
  }>({ target: { mode: "create", parent: null }, session: 0, open: false });
  const [deleting, setDeleting] = useState<{
    node: { key: string; title: string };
    open: boolean;
  }>();

  const open = (target: NodeSheetTarget) =>
    setSheet((current) => ({
      target,
      session: current.session + 1,
      open: true,
    }));
  const actions: TreeActions = {
    add: (parent) => open({ mode: "create", parent }),
    edit: (key) => open({ mode: "edit", key }),
    remove: (node) => setDeleting({ node, open: true }),
  };

  return (
    <>
      <HeaderBar
        title={t("catalogEditor.title")}
        actions={
          isAdmin ? (
            <>
              <Button variant="ghost" size="xs" asChild>
                <Link href="/admin/catalog">
                  <FileSpreadsheet strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t("catalogEditor.importExport")}
                  </span>
                </Link>
              </Button>
              <Button size="xs" onClick={() => actions.add(null)}>
                <Plus aria-hidden="true" />
                {t("catalogEditor.addRoot")}
              </Button>
            </>
          ) : undefined
        }
      />
      {isAdmin === false ? (
        <div className="p-4">
          <EmptyState
            icon={
              <ShieldOff
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalogEditor.notAvailable")}
            description={t("catalogEditor.notAvailableDescription")}
          />
        </div>
      ) : isAdmin === undefined ? (
        <TreeSkeleton level={0} />
      ) : (
        <TreeActionsContext.Provider value={actions}>
          <p className="border-b px-4 py-2 text-xs text-muted-foreground">
            {t("catalogEditor.description")}
          </p>
          <TreeLevel parentKey={null} level={0} />
        </TreeActionsContext.Provider>
      )}
      <CatalogNodeSheet
        key={sheet.session}
        open={sheet.open}
        onOpenChange={(next) =>
          setSheet((current) => ({ ...current, open: next }))
        }
        target={sheet.target}
      />
      {deleting && (
        <CatalogNodeDeleteDialog
          key={deleting.node.key}
          open={deleting.open}
          onOpenChange={(next) =>
            setDeleting((current) => current && { ...current, open: next })
          }
          node={deleting.node}
        />
      )}
    </>
  );
}

/** Rows to indent a level by, beside the chevron. */
const indent = (level: number) => ({ paddingLeft: `${8 + level * 20}px` });

function TreeSkeleton({ level }: { level: number }) {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex h-9 items-center gap-2 pr-4"
          style={indent(level)}
        >
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** The nodes right below one (the roots at the top), a page at a time. */
function TreeLevel({
  parentKey,
  level,
  locked = false,
}: {
  parentKey: string | null;
  level: number;
  /** The parent or a node above it is being deleted, so none of these can be changed. */
  locked?: boolean;
}) {
  const t = useI18n();
  const actions = useTreeActions();
  const { results, status, loadMore } = usePaginatedQuery(
    api.catalog.editor.children,
    { parentKey },
    { initialNumItems: pageSize },
  );

  if (status === "LoadingFirstPage") return <TreeSkeleton level={level} />;
  if (results.length === 0) {
    if (parentKey === null) {
      return (
        <div className="p-4">
          <EmptyState
            icon={
              <BookOpen
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalogEditor.emptyTitle")}
            description={t("catalogEditor.emptyDescription")}
            action={
              <Button size="xs" onClick={() => actions.add(null)}>
                <Plus aria-hidden="true" />
                {t("catalogEditor.addRoot")}
              </Button>
            }
          />
        </div>
      );
    }
    return (
      <p
        className="flex h-9 items-center pr-4 text-[13px] text-muted-foreground"
        style={indent(level + 1)}
      >
        {t("catalogEditor.nothingBelow")}
      </p>
    );
  }
  return (
    <>
      <ul className={cn(level === 0 && "divide-y border-b")}>
        {results.map((node) => (
          <TreeRow
            key={node.key}
            node={node}
            level={level}
            parentLocked={locked}
          />
        ))}
      </ul>
      {status === "CanLoadMore" && (
        <div className="py-1 pr-4" style={indent(level + 1)}>
          <Button variant="ghost" size="xs" onClick={() => loadMore(pageSize)}>
            {t("catalogEditor.showMore")}
          </Button>
        </div>
      )}
    </>
  );
}

const kindIcons = {
  country: Flag,
  theme: Layers,
  grouping: ListTree,
} as const;
const itemTypeIcons = { coin: Coins, banknote: Banknote } as const;

/** One node: open or close what's below it, add below it, edit or delete it. */
function TreeRow({
  node,
  level,
  parentLocked,
}: {
  node: TreeNode;
  level: number;
  parentLocked: boolean;
}) {
  const t = useI18n();
  const format = useFormatters();
  const catalogFormat = useCatalogFormat();
  const actions = useTreeActions();
  const [expanded, setExpanded] = useState(false);
  const title = catalogFormat.nodeTitle({ ...node });
  const isEntry = node.kind === "entry";
  /** A change runs on it or above it: it opens, but nothing can change it. */
  const locked = parentLocked || node.change !== undefined;
  const Icon =
    node.kind === "entry"
      ? itemTypeIcons[node.itemType ?? "coin"]
      : kindIcons[node.kind];
  const facts = [
    node.kind === "country" && node.country && format.country(node.country),
    node.kind === "theme" && t("catalogEditor.kinds.theme"),
    isEntry && catalogFormat.years(node.yearFrom, node.yearTo),
    !isEntry && t("catalogEditor.entryCount", { count: node.entryCount ?? 0 }),
  ].filter((fact): fact is string => Boolean(fact));
  const addBelow = () => {
    setExpanded(true);
    actions.add({
      key: node.key,
      kind: node.kind,
      title,
      country: node.country,
      itemType: node.itemType,
    });
  };
  const toggleLabel = t(
    expanded ? "catalogEditor.collapse" : "catalogEditor.expand",
    { title },
  );

  return (
    <li>
      <div
        className="group flex h-9 items-center gap-1.5 pr-2 text-[13px] hover:bg-muted/60"
        style={indent(level)}
      >
        {isEntry ? (
          <span className="size-6 shrink-0" />
        ) : (
          <IconButton
            className="size-6"
            aria-expanded={expanded}
            label={toggleLabel}
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronRight
              className={cn(
                "!size-3.5 transition-transform duration-150",
                expanded && "rotate-90",
              )}
            />
          </IconButton>
        )}
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => actions.edit(node.key)}
          className="min-w-0 truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {title}
        </button>
        {node.change && (
          <Badge className="shrink-0">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            {t(`catalogEditor.changes.${node.change}`)}
          </Badge>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {facts.join(" · ")}
        </span>
        {!isEntry && !locked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("catalogEditor.addBelowNamed", {
                  title,
                })}
                onClick={addBelow}
                className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Plus strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("catalogEditor.addBelow")}</TooltipContent>
          </Tooltip>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t("catalogEditor.actions", {
                    title,
                  })}
                  className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("catalogEditor.moreActions")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onSelect={() => actions.edit(node.key)}>
              <Pencil strokeWidth={1.75} />
              {t("catalogEditor.edit")}
            </DropdownMenuItem>
            {!isEntry && (
              <DropdownMenuItem disabled={locked} onSelect={addBelow}>
                <Plus strokeWidth={1.75} />
                {t("catalogEditor.addBelow")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={catalogNodeHref(node.key)}>
                <ExternalLink strokeWidth={1.75} />
                {t("catalogEditor.openInCatalog")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={locked}
              onSelect={() => actions.remove({ key: node.key, title })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 strokeWidth={1.75} />
              {t("catalogEditor.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && !isEntry && (
        <TreeLevel
          parentKey={node.key}
          level={level + 1}
          locked={parentLocked || node.change === "delete"}
        />
      )}
    </li>
  );
}
