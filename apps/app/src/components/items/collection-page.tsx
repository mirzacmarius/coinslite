"use client";

import {
  BrowserSkeleton,
  CollectionBrowser,
} from "@/components/collection/collection-browser";
import { useI18n } from "@/locales/client";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { Suspense } from "react";

/**
 * The Collection: every Item the person owns, searched, filtered, sorted
 * and paged as the URL says, under the totals. The URL is request data, so
 * everything that reads it streams in below the header (ADR 0004). Adding an
 * Item is the shell's: the sidebar, or the middle of the phone tabs.
 */
export function CollectionPage() {
  const t = useI18n();
  return (
    <>
      <HeaderBar title={t("nav.collection")} />
      <Suspense fallback={<BrowserSkeleton />}>
        <CollectionBrowser />
      </Suspense>
    </>
  );
}
