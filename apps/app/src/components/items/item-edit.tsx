"use client";

import { itemPageHref } from "@/components/collection/collection-url";
import { useLeaveGuard } from "@/components/leave-guard";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { ItemCatalogPicker } from "./item-catalog-picker";
import { ItemNotFound } from "./item-detail";
import { ItemFormBody } from "./item-form-body";
import { useItemForm } from "./use-item-form";

/** Cancel and Save, a size up on phones for a thumb. */
const phoneButton = "max-md:h-9 max-md:px-4 max-md:text-sm";

/** The Item as its pages read it. */
type PageItem = NonNullable<FunctionReturnType<typeof api.items.get>>;

const collectionLink = (label: string) => (
  <Link href="/collection" className="hover:text-foreground">
    {label}
  </Link>
);

/**
 * Edit Item: the Item form on a page of its own rather than in a dialog,
 * as MuseumLite edits an object, with every field open and Cancel and Save
 * in the bar. Its Catalog pill searches the Catalog for an entry to link,
 * also another one than the Item's, filling its facts in (use-item-form.ts).
 * Leaving with unsaved changes asks first (useLeaveGuard); saving goes back
 * to the Item's page, to the view of the Collection it was opened from.
 */
export function ItemEdit() {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  const itemHref = itemPageHref(itemId, useSearchParams().toString());
  // Each visit starts afresh from the Item as it is now: a page left behind
  // stays mounted, hidden, and its layout effects run again when it shows
  // (docs/adr/0004), so a visit given up on isn't there the next time.
  const [visit, setVisit] = useState(0);
  const shown = useRef(false);
  useLayoutEffect(() => {
    if (shown.current) setVisit((current) => current + 1);
    shown.current = true;
  }, []);
  if (item === undefined) return <ItemEditSkeleton />;
  if (item === null)
    return <ItemNotFound parent={collectionLink(t("nav.collection"))} />;
  return <EditForm key={visit} item={item} itemHref={itemHref} />;
}

function EditForm({ item, itemHref }: { item: PageItem; itemHref: string }) {
  const t = useI18n();
  const mod = useModifierKey();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const itemForm = useItemForm({
    open: true,
    // The form closes once saved: back to the Item's page, in place of this
    // one, so Back doesn't return to the form.
    onOpenChange: (open) => {
      if (!open) router.replace(itemHref);
    },
    item,
  });
  const { submit } = itemForm;
  const { leave, question } = useLeaveGuard(itemForm.changed, formRef);
  useUnsavedInput(itemForm.changed);
  return (
    <>
      <HeaderBar
        parent={
          <Link
            href={itemHref}
            className="max-w-40 truncate hover:text-foreground sm:max-w-64"
          >
            {item.title}
          </Link>
        }
        parentOnPhones={false}
        title={t("items.editItem")}
        actions={
          <>
            <Button
              variant="ghost"
              size="xs"
              className={phoneButton}
              onClick={() => leave(itemHref)}
            >
              {t("items.cancel")}
            </Button>
            {/* Not a submit button: Enter in a field never saves; the button
                and Cmd/Ctrl+Enter do (linear-style-ui keyboard rules). */}
            <Button
              type="button"
              size="xs"
              className={phoneButton}
              disabled={itemForm.submitting}
              onClick={(event) => submit(event.currentTarget)}
            >
              {itemForm.submitting && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              {t("items.save")}
              {mod && (
                <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground max-md:hidden">
                  {mod}↵
                </Kbd>
              )}
            </Button>
          </>
        }
      />
      <form
        ref={formRef}
        method="post"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            submit(event.currentTarget);
          }
        }}
        className="w-full max-w-2xl p-4"
      >
        <ItemFormBody itemForm={itemForm} />
      </form>
      <ItemCatalogPicker itemForm={itemForm} />
      {question}
    </>
  );
}

/** The Edit Item page while the Item loads: its bar and fields as placeholders. */
export function ItemEditSkeleton() {
  const t = useI18n();
  const placeholder = (size: string) => (
    <span className={cn("animate-pulse rounded bg-muted", size)} />
  );
  return (
    <>
      <HeaderBar
        parent={collectionLink(t("nav.collection"))}
        title={t("items.editItem")}
      />
      <div
        aria-busy="true"
        className="flex w-full max-w-2xl flex-col gap-3 p-4"
        aria-hidden="true"
      >
        {placeholder("h-5 w-64")}
        {placeholder("h-4 w-40")}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((pill) => (
            <span key={pill}>{placeholder("block h-7 w-24 rounded-md")}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3">
          {[0, 1, 2, 3, 4, 5].map((field) => (
            <span key={field}>
              {placeholder("block h-8 w-full rounded-md")}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
