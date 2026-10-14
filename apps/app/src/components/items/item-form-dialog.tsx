"use client";

import { CatalogPickerDialog } from "@/components/catalog/catalog-picker";
import { FormDialog, FormDialogCancel } from "@/components/form-dialog";
import { ItemLimitNotice } from "@/components/plans/plan-usage";
import { ScanNotice } from "@/components/scanner/scan-notice";
import { useI18n } from "@/locales/client";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
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
import { useSelector } from "@tanstack/react-form";
import { ChevronRight, History, Library, Loader2, X } from "lucide-react";
import { isCatalogType } from "./item-fields";
import { ItemFieldsProvider, useItemFields } from "./item-form-fields";
import { MoreDetails } from "./item-more-details";
import { ItemPills } from "./item-pills";
import { type ItemFormProps, useItemForm } from "./use-item-form";

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full shrink-0 resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

/**
 * The one form for an Item's every field: "New Item" in a compact dialog, or
 * "Edit Item" when given an `item`. Basic fields stay in view; the rest sit
 * under "More details", which opens by itself when it holds values or errors.
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
export function ItemFormDialog(props: ItemFormProps) {
  const { open, onOpenChange, item, copyOf } = props;
  const t = useI18n();
  const mod = useModifierKey();
  const itemForm = useItemForm(props);
  const { form, titleRef, linked, submit } = itemForm;
  const type = useSelector(form.store, (state) => state.values.type);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      changed={itemForm.changed}
      keepsDraft={itemForm.keepsDraft}
      onDiscard={item || copyOf ? undefined : itemForm.discardDraft}
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
                {t(
                  item
                    ? "items.editItem"
                    : copyOf
                      ? "items.duplicateTitle"
                      : "items.new",
                )}
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
              {t(item ? "items.editDescription" : "items.newDescription")}
            </DialogDescription>
          )}

          <ItemFieldsProvider
            form={form}
            rules={itemForm.rules}
            fromEntry={itemForm.fromEntry}
          >
            <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-3 pt-1">
              {!item && <ItemLimitNotice />}
              {!item && itemForm.scanned && (
                <ScanNotice scan={itemForm.scanned} />
              )}
              {itemForm.draftKept && (
                <DraftNotice onStartOver={itemForm.startOver} />
              )}
              <TitleAndNotes titleRef={titleRef} />
              <ItemPills
                linked={linked}
                editing={item !== undefined}
                onPickEntry={itemForm.pickAnother}
                onAlbumCreateFailed={itemForm.setFailed}
              />
              <MoreDetails
                open={itemForm.detailsOpen}
                onOpenChange={itemForm.setDetailsOpen}
                linked={linked !== undefined}
                currency={itemForm.amounts.currency ?? ""}
                locked={itemForm.amounts.locked}
              />
              {itemForm.failed && (
                <p role="alert" className="text-xs text-destructive">
                  {itemForm.failed}
                </p>
              )}
            </div>
          </ItemFieldsProvider>

          <DialogFooter>
            {item || copyOf ? (
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
                {t(item ? "items.save" : "items.add")}
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
      {!item && (
        <CatalogPickerDialog
          {...itemForm.picker}
          itemType={isCatalogType(type) ? type : "coin"}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
        />
      )}
    </FormDialog>
  );
}

/** The title, which a new Item can't be without, and notes, at the top of the form. */
function TitleAndNotes({
  titleRef,
}: {
  titleRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useI18n();
  const { form, baseId, rules, errorOf } = useItemFields();
  return (
    <>
      <form.Field name="title" validators={{ onChange: rules.title }}>
        {(field) => {
          const error = errorOf(field.state.meta.errors);
          return (
            <div className="flex flex-col gap-1">
              <input
                ref={titleRef}
                aria-label={t("items.title")}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${baseId}-title-error` : undefined}
                placeholder={t("items.titlePlaceholder")}
                className={titleInput}
                maxLength={itemLimits.title}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
              {error && (
                <p
                  id={`${baseId}-title-error`}
                  className="text-xs text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>
      <form.Field name="notes">
        {(field) => (
          <textarea
            aria-label={t("items.notes")}
            rows={2}
            placeholder={t("items.notesPlaceholder")}
            className={notesInput}
            maxLength={itemLimits.notes}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
    </>
  );
}

/**
 * Atop a New Item form that opened holding what was typed last time: says
 * so, with a way to start a new Item instead.
 */
function DraftNotice({ onStartOver }: { onStartOver: () => void }) {
  const t = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 py-1 pl-2 pr-1">
      <History
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
        {t("items.draftKept")}
      </p>
      <Button type="button" variant="ghost" size="xs" onClick={onStartOver}>
        {t("items.startOver")}
      </Button>
    </div>
  );
}
