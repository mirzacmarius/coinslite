"use client";

import { FormDialog, FormDialogCancel } from "@/components/form-dialog";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { IconButton } from "@coinslite/ui/icon-button";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { Switch } from "@coinslite/ui/switch";
import { ChevronRight, Library, Loader2, X } from "lucide-react";
import { ItemCatalogPicker } from "./item-catalog-picker";
import { ItemFormBody } from "./item-form-body";
import { type ItemFormProps, useItemForm } from "./use-item-form";

/**
 * The Item form in a compact dialog, for a new Item ("New Item") or a copy
 * of one ("Duplicate"); an Item is edited on its own page (item-edit.tsx).
 * Basic fields stay in view; the rest sit under "More details", which opens
 * by itself when it holds values or errors.
 *
 * Coins and banknotes are added from the Catalog by default (spec 5.4): each
 * opening starts on the Catalog picker; "Add manually" leads to typing the
 * facts in, and Esc closes the dialog. A picked entry fills the facts; the
 * Item stays linked to it and stores only the facts the person changes
 * (ADR 0001).
 *
 * After a coin scan the form opens filled with the scanner's suggestion,
 * marked as such, and the scan's photos become the new Item's when it's added.
 *
 * Duplicating (spec 5.5) opens the new Item's form filled in from `copyOf`,
 * linked to the same Catalog entry, without its photos; nothing is added
 * until the person saves.
 *
 * Its state and saving are use-item-form.ts's; what saving sends is
 * item-form-submit.ts's.
 */
export function ItemFormDialog(props: Omit<ItemFormProps, "item">) {
  const { open, onOpenChange, copyOf } = props;
  const t = useI18n();
  const mod = useModifierKey();
  const itemForm = useItemForm(props);
  const { titleRef, submit } = itemForm;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      changed={itemForm.changed}
      keepsDraft={itemForm.keepsDraft}
      onDiscard={itemForm.discardDraft}
    >
      <DialogContent
        className="sm:max-w-[600px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            submit(event.currentTarget);
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Library
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{t("nav.collection")}</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {t(copyOf ? "items.duplicateTitle" : "items.new")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("items.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          {copyOf ? (
            <DialogDescription className="px-4 text-xs text-muted-foreground">
              {t("items.duplicateDescription", { title: copyOf.title })}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {t("items.newDescription")}
            </DialogDescription>
          )}

          <ItemFormBody
            itemForm={itemForm}
            className="overflow-y-auto px-4 pb-3 pt-1"
          />

          <DialogFooter>
            {copyOf ? (
              <span />
            ) : (
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Switch
                  checked={itemForm.createMore}
                  onCheckedChange={itemForm.setCreateMore}
                />
                {t("items.createMore")}
              </label>
            )}
            <div className="flex items-center gap-2">
              <FormDialogCancel>{t("items.cancel")}</FormDialogCancel>
              {/* Not a submit button: Enter in a field or picker never saves the
                  dialog; the button and Cmd/Ctrl+Enter do (linear-style-ui keyboard rules). */}
              <Button
                type="button"
                disabled={itemForm.submitting}
                onClick={(event) => submit(event.currentTarget)}
              >
                {itemForm.submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t("items.add")}
                {mod && (
                  <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                    {mod}↵
                  </Kbd>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      {/* Beside the form's content, not in it, so keys pressed in the picker
          (Cmd/Ctrl+Enter) never reach the form. */}
      <ItemCatalogPicker itemForm={itemForm} />
    </FormDialog>
  );
}
