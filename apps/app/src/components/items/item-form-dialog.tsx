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
import { ChevronRight, Library, Loader2, X } from "lucide-react";
import { ItemCatalogPicker } from "./item-catalog-picker";
import { ItemFormBody } from "./item-form-body";
import { type ItemFormProps, useItemForm } from "./use-item-form";

/**
 * Duplicate (spec 5.5): the Item form in a compact dialog, opened from an
 * Item's page and filled in from `copyOf`, linked to the same Catalog entry,
 * without its photos; nothing is added until the person saves. A new Item is
 * added on its own page (new-item.tsx), and an Item is edited on its own page
 * (item-edit.tsx). Basic fields stay in view; the rest sit under "More
 * details", which opens by itself when it holds values or errors.
 *
 * Its state and saving are use-item-form.ts's; what saving sends is
 * item-form-submit.ts's.
 */
export function ItemFormDialog(
  props: Pick<ItemFormProps, "open" | "onOpenChange" | "onAdded"> & {
    copyOf: NonNullable<ItemFormProps["copyOf"]>;
  },
) {
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
    >
      <DialogContent
        className="sm:max-w-[37.5rem]"
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
            <div className="flex items-center gap-1 text-ui text-muted-foreground">
              <Library
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{t("nav.collection")}</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {t("items.duplicateTitle")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("items.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="px-4 text-xs text-muted-foreground">
            {t("items.duplicateDescription", { title: copyOf.title })}
          </DialogDescription>

          <ItemFormBody
            itemForm={itemForm}
            className="overflow-y-auto px-4 pb-3 pt-1"
          />

          <DialogFooter>
            <span />
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
