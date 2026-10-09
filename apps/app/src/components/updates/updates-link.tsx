"use client";

import { useI18n } from "@/locales/client";
import { cn } from "@coinslite/ui/utils";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { UnseenMarker } from "./unseen-marker";
import { updatesHref } from "./updates-href";
import { useUpdatesStatus } from "./use-updates-status";

/** Account's link to Updates, marked while there's a release the person hasn't seen. */
export function UpdatesLink() {
  const t = useI18n();
  const unseen = useUpdatesStatus()?.unseen === true;
  return (
    <div className="rounded-lg border bg-card p-1">
      <Link
        href={updatesHref}
        className="flex h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium hover:bg-muted"
      >
        <Sparkles
          className="size-4 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("updates.title")}
        {unseen && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <UnseenMarker />
            {t("updates.new")}
          </span>
        )}
        <ChevronRight
          className={cn("size-3.5 text-muted-foreground", !unseen && "ml-auto")}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
