"use client";

import { catalogNodeHref } from "@/components/catalog/catalog-levels";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { Button } from "@coinslite/ui/button";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * On the page of an Item added without a Catalog entry: the entry it looks
 * like, with Link and Not this. Linking keeps the Item's own facts that
 * differ from the entry's; Not this hides that entry for this Item for good,
 * and the next best (if any) takes its place. Nothing shows without one.
 */
export function CatalogSuggestion({ itemId }: { itemId: Id<"items"> }) {
  const t = useI18n();
  const suggestions = useQuery(api.catalogSuggestions.forItem, { itemId });
  const link = useMutation(api.catalogSuggestions.link);
  const dismiss = useMutation(api.catalogSuggestions.dismiss);
  const [busy, setBusy] = useState(false);
  const best = suggestions?.[0];
  if (!best) return null;

  /** Link the suggested entry, or turn it down ("Not this"). */
  const answer = async (action: "link" | "dismiss") => {
    setBusy(true);
    try {
      const args = { itemId, catalogEntryKey: best.key };
      if (action === "link") {
        await link(args);
        toast.success(t("catalogSuggestion.linked"));
      } else {
        await dismiss(args);
      }
    } catch {
      toast.error(t("catalogSuggestion.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label={t("catalogSuggestion.label")}
      className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2 text-ui"
    >
      <BookOpen
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1">
        {t("catalogSuggestion.looksLike", {
          title: (
            <Link
              href={catalogNodeHref(best.key)}
              className="font-medium hover:underline"
            >
              {best.title}
            </Link>
          ),
        })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={busy}
          onClick={() => void answer("link")}
        >
          {t("catalogSuggestion.link")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={busy}
          onClick={() => void answer("dismiss")}
        >
          {t("catalogSuggestion.notThis")}
        </Button>
      </div>
    </section>
  );
}
