"use client";

import { ItemLimitNotice } from "@/components/plans/plan-usage";
import { ScanNotice } from "@/components/scanner/scan-notice";
import { useI18n } from "@/locales/client";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import { Button } from "@coinslite/ui/button";
import { cn } from "@coinslite/ui/utils";
import { History } from "lucide-react";
import { ItemFieldsProvider, useItemFields } from "./item-form-fields";
import { MoreDetails } from "./item-more-details";
import { ItemPills } from "./item-pills";
import type { ItemFormState } from "./use-item-form";

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full shrink-0 resize-none bg-transparent px-0 text-base placeholder:text-muted-foreground focus:outline-none md:text-sm";

/**
 * The Item form's fields, in the New Item dialog (item-form-dialog.tsx) and
 * on the Edit Item page (item-edit.tsx): a new Item's notices, the title and
 * notes, the pills, then More details, which the Edit Item page shows open
 * without its toggle, and what went wrong saving.
 */
export function ItemFormBody({
  itemForm,
  className,
}: {
  itemForm: ItemFormState;
  className?: string;
}) {
  const editing = itemForm.editing;
  return (
    <ItemFieldsProvider
      form={itemForm.form}
      rules={itemForm.rules}
      fromEntry={itemForm.fromEntry}
    >
      <div className={cn("flex flex-col gap-2", className)}>
        {!editing && <ItemLimitNotice />}
        {!editing && itemForm.scanned && <ScanNotice scan={itemForm.scanned} />}
        {itemForm.draftKept && <DraftNotice onStartOver={itemForm.startOver} />}
        <TitleAndNotes titleRef={itemForm.titleRef} />
        <ItemPills
          linked={itemForm.linked}
          onPickEntry={itemForm.openPicker}
          onAlbumCreateFailed={itemForm.setFailed}
        />
        <MoreDetails
          open={itemForm.detailsOpen}
          onOpenChange={editing ? undefined : itemForm.setDetailsOpen}
          linked={itemForm.linked !== undefined}
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
      <p className="min-w-0 flex-1 text-ui text-muted-foreground">
        {t("items.draftKept")}
      </p>
      <Button type="button" variant="ghost" size="xs" onClick={onStartOver}>
        {t("items.startOver")}
      </Button>
    </div>
  );
}
