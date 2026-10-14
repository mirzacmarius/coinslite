"use client";

import {
  BrowserSkeleton,
  CollectionBrowser,
} from "@/components/collection/collection-browser";
import { ScanCoinButton } from "@/components/scanner/scan-coin";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { useAddItem } from "./add-item";

/**
 * The Collection: every Item the person owns, searched, filtered, sorted
 * and paged as the URL says, under the totals. The URL is request data, so
 * everything that reads it streams in below the header (ADR 0004). Its Add
 * Item shows on phones only: wider screens have it in the sidebar.
 */
export function CollectionPage() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <>
      <HeaderBar
        title={t("nav.collection")}
        actions={
          <>
            <ScanCoinButton />
            <Button size="xs" className="md:hidden" onClick={() => addItem()}>
              <Plus aria-hidden="true" />
              {t("items.add")}
            </Button>
          </>
        }
      />
      <Suspense fallback={<BrowserSkeleton />}>
        <CollectionBrowser />
      </Suspense>
    </>
  );
}
