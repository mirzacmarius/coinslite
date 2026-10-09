"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Kbd } from "@coinslite/ui/kbd";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CatalogSearchDialog } from "./catalog-search";

/** Where a Catalog node is browsed: every level has its own page. */
export const catalogNodeHref = (key: string) => `/catalog/${key}`;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * The Catalog page's search: a header button, or `/`, opens it; picking a
 * result opens that node.
 */
export function CatalogSearchButton() {
  const t = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTyping(event.target) &&
        !document.querySelector('[role=dialog][data-state="open"]')
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        <Search strokeWidth={1.75} aria-hidden="true" />
        {t("catalogSearch.open")}
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
