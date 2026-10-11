"use client";

import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { itemErrors, itemLimits } from "@coinslite/backend/convex/items/rules";
import { formatNumber, parseMoney } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
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
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { HandCoins, Loader2, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import { localToday } from "./item-fields";

type SaleValues = {
  quantity: string;
  soldOn: string;
  salePrice: string;
  saleNote: string;
};

/**
 * "Sell" for an Item, or "Edit sale" for one already sold: how many pieces
 * (all by default; fewer split off a new sold Item), the sold-on date, the
 * sale price per piece in the Home currency and a note.
 */
export function SellItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: Doc<"items"> & { currency: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const baseId = useId();
  const sell = useMutation(api.items.sell);
  const editing = item.soldOn !== undefined;
  // Some pieces can be sold, and the rest kept, while the Item is owned.
  const splittable = !editing && item.quantity > 1;
  const [failed, setFailed] = useState<string>();
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState<SaleValues>(() => ({
    quantity: String(item.quantity),
    soldOn: item.soldOn ?? localToday(),
    salePrice:
      item.salePrice === undefined
        ? ""
        : formatNumber(item.salePrice / 100, locale, {
            useGrouping: false,
            minimumFractionDigits: 2,
          }),
    saleNote: item.saleNote ?? "",
  }));

  const rules = useMemo(
    () => ({
      quantity: z.string().refine(
        (text) => {
          const pieces = Number(text.trim());
          return (
            /^\d+$/.test(text.trim()) && pieces >= 1 && pieces <= item.quantity
          );
        },
        t("sale.errors.quantity", { max: item.quantity }),
      ),
      soldOn: z
        .string()
        .refine(
          (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= localToday(),
          t("sale.errors.date"),
        ),
      salePrice: z
        .string()
        .refine(
          (text) => !text.trim() || parseMoney(text, locale) !== null,
          t("items.errors.amount"),
        ),
    }),
    [t, locale, item.quantity],
  );

  const form = useForm({
    defaultValues: defaults,
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      // Left as shown, it means every piece, however many there are by now.
      const pieces =
        splittable && form.getFieldMeta("quantity")?.isDirty
          ? Number(value.quantity.trim())
          : undefined;
      try {
        await sell({
          itemId: item._id,
          quantity: pieces,
          soldOn: value.soldOn,
          salePrice: value.salePrice.trim()
            ? parseMoney(value.salePrice, locale) ?? undefined
            : undefined,
          saleNote: value.saleNote,
        });
      } catch (failure) {
        const code = failure instanceof ConvexError ? failure.data : undefined;
        setFailed(
          code === itemErrors.invalidDate
            ? t("sale.errors.date")
            : code === itemErrors.soldBeforePurchase
              ? t("sale.errors.beforePurchase")
              : code === itemErrors.invalidQuantity
                ? t("sale.errors.quantity", { max: item.quantity })
                : t("sale.failed"),
        );
        return;
      }
      toast.success(
        t(
          editing
            ? "sale.saved"
            : pieces !== undefined && pieces < item.quantity
              ? "sale.soldPart"
              : "sale.sold",
        ),
      );
      form.reset();
      onOpenChange(false);
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const isDirty = form.useStore((state) => state.isDirty);
  useUnsavedInput(open && isDirty);
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submitForm(form, t("common.saveFailed"));
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm(form, t("common.saveFailed"));
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <HandCoins
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <DialogTitle className="truncate">
                {editing
                  ? t("sale.editTitle")
                  : t("sale.title", { title: item.title })}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("sale.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="px-4 text-xs text-muted-foreground">
            {splittable ? t("sale.descriptionSplit") : t("sale.description")}
          </DialogDescription>

          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-3 pt-3">
            {splittable && (
              <form.Field
                name="quantity"
                validators={{ onChange: rules.quantity }}
              >
                {(field) => (
                  <Field
                    id={`${baseId}-quantity`}
                    label={t("sale.quantity")}
                    hint={t("sale.quantityHint", { max: item.quantity })}
                    error={errorOf(field.state.meta.errors)}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        inputMode="numeric"
                        className="w-24"
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
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form.Field name="soldOn" validators={{ onChange: rules.soldOn }}>
                {(field) => (
                  <Field
                    id={`${baseId}-soldOn`}
                    label={t("sale.soldOn")}
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
              <form.Field
                name="salePrice"
                validators={{ onChange: rules.salePrice }}
              >
                {(field) => (
                  <Field
                    id={`${baseId}-salePrice`}
                    label={t("sale.salePrice")}
                    hint={t("items.perPiece")}
                    error={errorOf(field.state.meta.errors)}
                  >
                    {(control) => (
                      <MoneyInput
                        {...control}
                        currency={item.currency}
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
            <form.Field name="saleNote">
              {(field) => (
                <Field id={`${baseId}-saleNote`} label={t("sale.note")}>
                  {(control) => (
                    <Input
                      {...control}
                      placeholder={t("sale.notePlaceholder")}
                      maxLength={itemLimits.saleNote}
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
                  {t("sale.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {editing ? t("sale.save") : t("sale.confirm")}
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
    </Dialog>
  );
}
