"use client";

import { FormDialog } from "@/components/form-dialog";
import { localToday } from "@/components/items/item-fields";
import { formChanged } from "@/lib/discard-changes";
import { submitForm } from "@/lib/submit-form";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { bulkErrors } from "@coinslite/backend/convex/items/bulkRules";
import { itemErrors, itemLimits } from "@coinslite/backend/convex/items/rules";
import { parseMoney } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { Field } from "@coinslite/ui/field";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { MoneyInput } from "@coinslite/ui/money-input";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Loader2, Receipt, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import type { ItemSelection } from "./use-item-selection";

/**
 * A Set purchase done: on how many Items, and how to undo it, which says how
 * many Items got their purchase back and how many were skipped.
 */
type PurchaseSet = {
  count: number;
  undo: () => Promise<FunctionReturnType<typeof api.items.undoPurchase>>;
};

/**
 * Select mode's Set purchase, for a bought lot: a Purchase price per piece,
 * purchase date and source to set on every selected Item. Says how many
 * through `onSet`, with `undo`.
 */
export function SetPurchaseButton({
  selection,
  onSet,
}: {
  selection: ItemSelection;
  onSet: (result: PurchaseSet) => void;
}) {
  const t = useI18n();
  // Each opening starts the form afresh.
  const [dialog, setDialog] = useState({ open: false, key: 0 });
  const { count, selected } = selection;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={count === 0}
        onClick={() => setDialog(({ key }) => ({ open: true, key: key + 1 }))}
      >
        <Receipt aria-hidden="true" />
        {t("collection.setPurchase")}
      </Button>
      <SetPurchaseDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog(({ key }) => ({ open, key }))}
        itemIds={[...selected.keys()]}
        onSet={onSet}
      />
    </>
  );
}

type PurchaseValues = {
  purchasePrice: string;
  purchaseDate: string;
  source: string;
};

const empty: PurchaseValues = {
  purchasePrice: "",
  purchaseDate: "",
  source: "",
};

/**
 * The Set purchase form: each field optional, checked as the Item form
 * checks it. A field left empty keeps each Item's own value; at least one
 * must be filled in.
 */
function SetPurchaseDialog({
  open,
  onOpenChange,
  itemIds,
  onSet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: Id<"items">[];
  onSet: (result: PurchaseSet) => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const baseId = useId();
  const user = useQuery(api.users.getUser, open ? {} : "skip");
  const setPurchase = useMutation(api.items.setPurchase);
  const undoPurchase = useMutation(api.items.undoPurchase);
  const [failed, setFailed] = useState<string>();
  const count = itemIds.length;

  const rules = useMemo(
    () => ({
      purchasePrice: z
        .string()
        .refine(
          (text) => !text.trim() || parseMoney(text, locale) !== null,
          t("items.errors.amount"),
        ),
      purchaseDate: z
        .string()
        .refine(
          (date) => !date || date <= localToday(),
          t("items.errors.date"),
        ),
    }),
    [t, locale],
  );

  const form = useForm({
    defaultValues: empty,
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      const purchase = {
        purchasePrice: value.purchasePrice.trim()
          ? parseMoney(value.purchasePrice, locale) ?? undefined
          : undefined,
        purchaseDate: value.purchaseDate || undefined,
        source: value.source.trim() || undefined,
      };
      if (Object.values(purchase).every((field) => field === undefined)) {
        setFailed(t("collection.purchaseEmpty"));
        return;
      }
      let done: FunctionReturnType<typeof api.items.setPurchase>;
      try {
        done = await setPurchase({ itemIds, ...purchase });
      } catch (failure) {
        const code = failure instanceof ConvexError ? failure.data : undefined;
        setFailed(
          code === itemErrors.invalidAmount
            ? t("items.errors.amount")
            : code === itemErrors.invalidDate
              ? t("items.errors.date")
              : code === bulkErrors.emptyPurchase
                ? t("collection.purchaseEmpty")
                : t("collection.purchaseFailed"),
        );
        return;
      }
      form.reset();
      onOpenChange(false);
      const { set, before } = done;
      onSet({ count, undo: () => undoPurchase({ before, set }) });
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const changed = form.useStore((state) => formChanged(state, empty));
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} changed={changed}>
      <DialogContent
        className="sm:max-w-[480px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submitForm(form, t("common.saveFailed"), event.currentTarget);
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm(form, t("common.saveFailed"), event.currentTarget);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <Receipt
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <DialogTitle className="truncate">
                {t("collection.setPurchase")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("items.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="px-4 text-xs text-muted-foreground">
            {t("collection.purchaseHint")}
          </DialogDescription>

          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-3 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form.Field
                name="purchasePrice"
                validators={{ onChange: rules.purchasePrice }}
              >
                {(field) => (
                  <Field
                    id={`${baseId}-purchasePrice`}
                    label={t("items.purchasePrice")}
                    hint={t("items.perPiece")}
                    error={errorOf(field.state.meta.errors)}
                  >
                    {(control) => (
                      <MoneyInput
                        {...control}
                        currency={user?.homeCurrency ?? ""}
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                      />
                    )}
                  </Field>
                )}
              </form.Field>
              <form.Field
                name="purchaseDate"
                validators={{ onChange: rules.purchaseDate }}
              >
                {(field) => (
                  <Field
                    id={`${baseId}-purchaseDate`}
                    label={t("items.purchaseDate")}
                    error={errorOf(field.state.meta.errors)}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="date"
                        max={localToday()}
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                      />
                    )}
                  </Field>
                )}
              </form.Field>
            </div>
            <form.Field name="source">
              {(field) => (
                <Field id={`${baseId}-source`} label={t("items.source")}>
                  {(control) => (
                    <Input
                      {...control}
                      placeholder={t("items.sourcePlaceholder")}
                      maxLength={itemLimits.source}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                    />
                  )}
                </Field>
              )}
            </form.Field>
            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {failed}
              </p>
            )}
          </div>

          <DialogFooter>
            <span />
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t("collection.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting || count === 0}>
                {submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t("collection.purchaseApply", { count })}
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
    </FormDialog>
  );
}
