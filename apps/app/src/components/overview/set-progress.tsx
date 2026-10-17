"use client";

import { setHref } from "@/components/catalog/catalog-levels";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type SetProgress,
  closestSets,
} from "@coinslite/backend/convex/catalog/setProgress";
import { Progress } from "@coinslite/ui/progress";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, useMemo } from "react";

/**
 * The Sets the person is closest to completing, among those they hold an
 * entry of (catalog/setProgress.ts), each with held / total and % as its
 * Set view shows them, and opening it. Absent when there are none.
 */
export function SetProgressCard({ progress }: { progress: SetProgress }) {
  const t = useI18n();
  const format = useFormatters();
  const { nodeTitle } = useCatalogFormat();
  const titleId = useId();
  const sets = useMemo(() => closestSets(progress), [progress]);
  if (sets.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl bg-card"
    >
      <div className="flex h-10 items-center border-b px-4">
        <h2 id={titleId} className="text-ui font-medium">
          {t("overview.setProgress")}
        </h2>
      </div>
      <ul className="divide-y">
        {sets.map((set) => {
          const { denomination, series } = set.scope;
          // A grouping by its title; a denomination path by its denomination and series, in its country.
          const [name, place] =
            denomination === undefined
              ? [nodeTitle(set.node), set.parent && nodeTitle(set.parent)]
              : [
                  [denomination ?? t("catalog.noDenomination"), series]
                    .filter(Boolean)
                    .join(" · "),
                  nodeTitle(set.node),
                ];
          return (
            <li key={set.id}>
              <Link
                href={setHref(set.scope)}
                className="flex min-h-14 items-center gap-3 px-4 py-2 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1 truncate text-ui font-medium">
                      {name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {format.number(set.percent / 100, { style: "percent" })}
                    </span>
                  </span>
                  {/* The text beside it says as much. */}
                  <span aria-hidden="true">
                    <Progress
                      value={set.held}
                      max={set.total}
                      label={t("sets.completionLabel")}
                    />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[
                      place,
                      t("sets.completion", {
                        held: format.number(set.held),
                        total: format.number(set.total),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
