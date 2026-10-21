"use client";

import { itemPageHref } from "@/components/collection/collection-url";
import { useLeaveGuard } from "@/components/leave-guard";
import { ScanCoin, useScanner } from "@/components/scanner/scan-coin";
import type { ScanPreset } from "@/components/scanner/scan-preset";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { Button } from "@coinslite/ui/button";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { Switch } from "@coinslite/ui/switch";
import { cn } from "@coinslite/ui/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ItemCatalogPicker } from "./item-catalog-picker";
import { ItemFormBody } from "./item-form-body";
import { useItemForm } from "./use-item-form";

const collectionHref = "/collection";

/**
 * New Item (spec 5.4): adding an Item on a page of its own rather than in a
 * dialog, which is hard to fill in on a phone. For those who may scan it
 * starts with the coin scanner (scanner/scan-coin.tsx), which hands over to
 * the form; for everyone else, with the form. The form is the one the
 * dialogs had (use-item-form.ts), with Cancel and Add in the bar and
 * "Create more" below it. Leaving with unsaved input asks first
 * (useLeaveGuard); adding goes to the new Item's page.
 */
export function NewItem() {
  // Each visit starts afresh: a page left behind stays mounted, hidden, and
  // its layout effects run again when it shows (docs/adr/0004).
  const [visit, setVisit] = useState(0);
  const shown = useRef(false);
  useLayoutEffect(() => {
    if (shown.current) setVisit((current) => current + 1);
    shown.current = true;
  }, []);
  return <NewItemForm key={visit} />;
}

function NewItemForm() {
  const t = useI18n();
  const mod = useModifierKey();
  const router = useRouter();
  const scanner = useScanner();
  // Around the scanner and the form, which take turns in it.
  const contentRef = useRef<HTMLDivElement>(null);
  // The scanner comes first, until it hands over to the form.
  const [scanning, setScanning] = useState(true);
  const [scan, setScan] = useState<ScanPreset>();
  const added = useRef<Id<"items">>(undefined);
  const itemForm = useItemForm({
    open: true,
    // The form closes once added: to the new Item's page (to the
    // Collection after several from the Catalog picker), in place of this
    // one, so Back doesn't return to the form.
    onOpenChange: (open) => {
      if (!open)
        router.replace(
          added.current ? itemPageHref(added.current, "") : collectionHref,
        );
    },
    onAdded: (itemId) => {
      added.current = itemId;
    },
    newItemType: scan ? "coin" : undefined,
    scan,
  });
  const { submit, titleRef } = itemForm;
  const { leave, question } = useLeaveGuard(itemForm.changed, contentRef);
  useUnsavedInput(itemForm.changed);
  const step =
    scanner === undefined
      ? "loading"
      : scanning && scanner.available
        ? "scan"
        : "form";
  // The form starts on its title, as it did in the dialog.
  useEffect(() => {
    if (step === "form") titleRef.current?.focus({ preventScroll: true });
  }, [step, titleRef]);

  return (
    <>
      <HeaderBar
        parent={
          <Link href={collectionHref} className="hover:text-foreground">
            {t("nav.collection")}
          </Link>
        }
        title={t("items.new")}
        actions={
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => leave(collectionHref)}
            >
              {t("items.cancel")}
            </Button>
            {step === "form" && (
              // Not a submit button: Enter in a field never saves; the
              // button and Cmd/Ctrl+Enter do (linear-style-ui keyboard rules).
              <Button
                type="button"
                size="xs"
                disabled={itemForm.submitting}
                onClick={(event) => submit(event.currentTarget)}
              >
                {itemForm.submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t("items.add")}
                {mod && (
                  <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground max-md:hidden">
                    {mod}↵
                  </Kbd>
                )}
              </Button>
            )}
          </>
        }
      />
      <div ref={contentRef} className="w-full max-w-2xl p-4">
        {step === "loading" ? (
          <NewItemSkeleton />
        ) : step === "scan" ? (
          <ScanCoin
            onHandOver={(next) => {
              setScan(next);
              setScanning(false);
            }}
          />
        ) : (
          <form
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
            className="flex flex-col gap-4"
          >
            <ItemFormBody itemForm={itemForm} />
            <div className="border-t pt-3">
              <label className="inline-flex items-center gap-2 text-ui text-muted-foreground">
                <Switch
                  checked={itemForm.createMore}
                  onCheckedChange={itemForm.setCreateMore}
                />
                {t("items.createMore")}
              </label>
            </div>
          </form>
        )}
      </div>
      <ItemCatalogPicker itemForm={itemForm} />
      {question}
    </>
  );
}

/** The page while it learns whether the person may scan: its fields as placeholders. */
function NewItemSkeleton() {
  const placeholder = (size: string) => (
    <span className={cn("animate-pulse rounded bg-muted", size)} />
  );
  return (
    <div aria-busy="true" className="flex flex-col gap-3" aria-hidden="true">
      {placeholder("h-5 w-64")}
      {placeholder("h-4 w-40")}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((pill) => (
          <span key={pill}>{placeholder("block h-7 w-24 rounded-md")}</span>
        ))}
      </div>
    </div>
  );
}
