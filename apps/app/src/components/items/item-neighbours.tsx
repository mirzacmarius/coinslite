"use client";

import { itemInViewHref } from "@/components/collection/collection-url";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import { Kbd } from "@coinslite/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isTyping } from "./add-item";

type Neighbour = { _id: string; title: string } | null;

/**
 * Previous and next in the Collection view the Item was opened from, in the
 * view's order across its pages; ← and → do the same unless someone is
 * typing or a dialog or menu is open. Nothing at either end, and nothing
 * while the neighbours load or when the view doesn't show the Item.
 */
export function ItemNeighbours({
  itemId,
  view,
}: {
  itemId: string;
  view: CollectionView;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const router = useRouter();
  const near = useQuery(api.collection.neighbours, { view, itemId, locale });
  const previous = near?.previous ?? null;
  const next = near?.next ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isTyping(event.target) ||
        document.querySelector('[role=dialog][data-state="open"]') ||
        (event.target instanceof Element &&
          event.target.closest("[role=menu],[role=listbox]"))
      )
        return;
      const to =
        event.key === "ArrowLeft"
          ? previous
          : event.key === "ArrowRight"
            ? next
            : null;
      if (!to) return;
      event.preventDefault();
      router.push(itemInViewHref(to._id, view));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previous, next, router, view]);

  if (!near) return null;
  return (
    <span className="flex items-center">
      <NeighbourLink
        to={previous}
        view={view}
        icon={ChevronLeft}
        shortcut="←"
        label={previous && t("items.previousItem", { title: previous.title })}
      />
      <NeighbourLink
        to={next}
        view={view}
        icon={ChevronRight}
        shortcut="→"
        label={next && t("items.nextItem", { title: next.title })}
      />
    </span>
  );
}

function NeighbourLink({
  to,
  view,
  icon: Icon,
  shortcut,
  label,
}: {
  to: Neighbour;
  view: CollectionView;
  icon: LucideIcon;
  shortcut: string;
  label: string | null;
}) {
  // Keeps its place at either end, so the other arrow doesn't move.
  if (!to || !label) return <span className="size-7" aria-hidden="true" />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon-xs">
          <Link href={itemInViewHref(to._id, view)} aria-label={label}>
            <Icon strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        <Kbd className="border-background/20 bg-background/10 text-background">
          {shortcut}
        </Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
