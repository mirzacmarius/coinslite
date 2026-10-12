"use client";

import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { ActionLabel } from "@coinslite/ui/header-bar";
import { Kbd } from "@coinslite/ui/kbd";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { catalogNodeHref } from "./catalog-levels";
import { CatalogSearchDialog } from "./catalog-search";

/** Where a Catalog node is browsed: every level has its own page (catalog-levels.ts). */
export { catalogNodeHref };

/**
 * The Catalog page's search: a header button, or `/`, opens it; picking a
 * result opens that node.
 */
export function CatalogSearchButton() {
  const t = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useShortcut("/", () => setOpen(true));

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        <Search strokeWidth={1.75} aria-hidden="true" />
        <ActionLabel>{t("catalogSearch.open")}</ActionLabel>
        <Kbd className="hidden sm:inline-flex" aria-hidden="true">
          /
        </Kbd>
      </Button>
      <CatalogSearchDialog
        open={open}
        onOpenChange={setOpen}
        title={t("catalogSearch.title")}
        placeholder={t("catalogSearch.placeholder")}
        pickHint={t("catalogSearch.openHint")}
        onPick={(hit) => {
          setOpen(false);
          router.push(catalogNodeHref(hit.key));
        }}
      />
    </>
  );
}
