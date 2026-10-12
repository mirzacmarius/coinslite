"use client";

import { collectionHref } from "@/components/collection/collection-url";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type NeedsAttention,
  attentionKinds,
} from "@coinslite/backend/convex/items/attention";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

/**
 * How many owned Items lack a Market value, a photo, or (coins and
 * banknotes) a Grade, each opening the Collection filtered to exactly those
 * Items. A count of none isn't listed; with nothing to point out, the card
 * is absent.
 */
export function NeedsAttentionCard({ counts }: { counts: NeedsAttention }) {
  const t = useI18n();
  const format = useFormatters();
  const titleId = useId();
  const listed = attentionKinds.filter((kind) => counts[kind] > 0);
  if (listed.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl bg-card"
    >
      <div className="flex h-10 items-center border-b px-4">
        <h2 id={titleId} className="text-[13px] font-medium">
          {t("overview.needsAttention")}
        </h2>
      </div>
      <ul className="divide-y">
        {listed.map((kind) => (
          <li key={kind}>
            <Link
              href={collectionHref({ without: kind })}
              className="flex min-h-12 items-center gap-3 px-4 py-2 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted"
            >
              <span className="min-w-0 flex-1 text-[13px]">
                {t(`overview.attention.${kind}`)}
              </span>
              <span className="shrink-0 text-[13px] font-medium tabular-nums">
                {format.number(counts[kind])}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
