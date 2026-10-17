"use client";

import { wantlistHref } from "@/components/wantlist/wantlist";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronRight, Heart } from "lucide-react";
import Link from "next/link";

/**
 * How many Catalog entries the person wants, opening the Wantlist. Absent
 * with no wants, and while the Catalog is hidden (the count is then 0).
 */
export function WantlistCard() {
  const t = useI18n();
  const count = useQuery(api.wants.count, {});
  if (!count) return null;
  return (
    <Link
      href={wantlistHref}
      className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-4 py-2 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Heart
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="text-ui font-medium">{t("wantlist.title")}</span>
      <span className="flex-1 text-ui tabular-nums text-muted-foreground">
        {t("wantlist.count", { count })}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  );
}
