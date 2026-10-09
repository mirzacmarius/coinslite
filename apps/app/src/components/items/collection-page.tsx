"use client";

import { CollectionTotalsSection } from "@/components/collection-totals/collection-totals";
import { CollectionBrowser } from "@/components/collection/collection-browser";
import { ResultsSkeleton } from "@/components/collection/collection-results";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { useAddItem } from "./add-item";

/**
 * The Collection: every Item the person owns, searched, filtered, sorted
 * and paged as the URL says. The URL is request data, so everything that
 * reads it streams in below the header (ADR 0004).
 */
export function CollectionPage() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <>
      <HeaderBar
        title={t("nav.collection")}
        actions={
          <Button size="xs" onClick={() => addItem()}>
            <Plus aria-hidden="true" />
            {t("items.add")}
          </Button>
        }
      />
      <CollectionTotalsSection />
      <Suspense
        fallback={
          <>
            <div className="h-10 border-b" aria-hidden="true" />
            <ResultsSkeleton />
          </>
        }
      >
        <CollectionBrowser />
      </Suspense>
    </>
  );
}
