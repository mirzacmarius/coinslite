"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { saveFile } from "@/lib/save-file";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { collectionExportErrors } from "@coinslite/backend/convex/collection/exportRules";
import {
  clampSkip,
  labelLayouts,
  labelSheetErrors,
  labelSheetLimits,
  labelSizes,
  labelsPerSheet,
  papers,
} from "@coinslite/backend/convex/collection/labelSheet";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { planErrors } from "@coinslite/backend/convex/plans/rules";
import { Button } from "@coinslite/ui/button";
import { Checkbox } from "@coinslite/ui/checkbox";
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
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useAction, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { ConvexError } from "convex/values";
import { Download, Loader2, Printer, Sparkles, X } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useId, useState } from "react";
import {
  type StoredLabelOptions,
  labelMeasure,
  paperNames,
  readLabelOptions,
  sheetsFor,
} from "./label-options";

/** Which Items labels are printed for: a Collection view's, or chosen ones. */
export type LabelSource = FunctionArgs<
  typeof api.collectionLabels.download
>["source"];

const storageKey = "labels.options";

/** The choices last made on this device; the defaults when there are none. */
function loadOptions() {
  try {
    return readLabelOptions(window.localStorage.getItem(storageKey));
  } catch {
    return readLabelOptions(null);
  }
}

function saveOptions(options: StoredLabelOptions) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(options));
  } catch {
    // Storage can be refused (private browsing); the choice then isn't kept.
  }
}

/**
 * Print labels (spec 7): makes sheets of labels for `source` as a PDF to
 * print, one label per Item or per piece. `items` and `pieces` count what
 * it covers; `pieces` is undefined when unknown, as for a selection. The
 * choices start from the last ones made on this device, the used labels to
 * skip from none. On the Free plan it shows the way to Premium instead.
 */
export function LabelsDialog({
  open,
  onOpenChange,
  source,
  description,
  items,
  pieces,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LabelSource;
  /** What the labels are for, e.g. "Labels for the 12 Items in this view". */
  description: string;
  items: number;
  pieces?: number;
}) {
  const t = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[30rem]">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-1.5 text-ui text-muted-foreground">
            <Printer
              className="size-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <DialogTitle className="truncate text-foreground">
              {t("labels.title")}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <IconButton type="button" label={t("labels.close")} shortcut="Esc">
              <X />
            </IconButton>
          </DialogClose>
        </DialogHeader>
        {/* Mounted while open only, so each opening starts afresh. */}
        <LabelsForm
          source={source}
          description={description}
          items={items}
          pieces={pieces}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LabelsForm({
  source,
  description,
  items,
  pieces,
  onDone,
}: {
  source: LabelSource;
  description: string;
  items: number;
  pieces?: number;
  onDone: () => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const usage = useQuery(api.plans.usage);
  const download = useAction(api.collectionLabels.download);
  const [options, setOptions] = useState(loadOptions);
  const [skipText, setSkipText] = useState("0");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string>();
  const skipId = useId();
  const perPieceId = useId();

  const layout = labelLayouts[options.paper][options.size];
  const perSheet = labelsPerSheet(layout);
  const skip = clampSkip(layout, Number(skipText));
  const labels = options.perPiece ? pieces : items;
  const limit = format.number(labelSheetLimits.labels);
  const tooMany = (labels ?? items) > labelSheetLimits.labels;
  const smallSize = options.size === "small";

  const change = (next: Partial<StoredLabelOptions>) => {
    const value = { ...options, ...next };
    setOptions(value);
    saveOptions(value);
  };

  const errorText = (failure: unknown) => {
    const code = failure instanceof ConvexError ? String(failure.data) : "";
    switch (code) {
      case planErrors.premiumRequired:
        return t("labels.premiumOnly");
      case labelSheetErrors.tooManyLabels:
        return t("labels.tooMany", { limit });
      case collectionExportErrors.incomplete:
        return t("collectionExport.tooLarge");
      case homeCurrencyErrors.changing:
        return t("homeCurrency.busy");
      default:
        return t("labels.failed");
    }
  };

  const submit = async () => {
    setFailed(undefined);
    setBusy(true);
    try {
      const { fileName, pdf } = await download({
        source,
        options: { ...options, skip },
        locale,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      saveFile(fileName, [pdf], "application/pdf");
      toast.success(t("labels.downloaded"));
      onDone();
    } catch (failure) {
      setFailed(errorText(failure));
    } finally {
      setBusy(false);
    }
  };

  if (usage?.plan === "free") {
    return (
      <>
        <div className="px-4 pb-4 pt-1">
          <DialogDescription>{t("labels.premiumOnly")}</DialogDescription>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              {t("labels.cancel")}
            </Button>
          </DialogClose>
          <Button asChild>
            <Link href={upgradeHref}>
              <Sparkles strokeWidth={1.75} aria-hidden="true" />
              {t("plans.upgradeToPremium")}
            </Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
        <DialogDescription>{description}</DialogDescription>
        <Choice
          label={t("labels.size")}
          hint={`${t(`labels.uses.${options.size}`)} · ${labelMeasure(
            layout,
            options.paper,
            format.number,
          )}`}
        >
          <SegmentedControl
            label={t("labels.size")}
            value={options.size}
            onChange={(size) => change({ size })}
            options={labelSizes.map((size) => ({
              value: size,
              label: t(`labels.sizes.${size}`),
            }))}
          />
        </Choice>
        <Choice
          label={t("labels.paper")}
          hint={
            layout.template
              ? t("labels.template", {
                  template: layout.template,
                  count: perSheet,
                })
              : t("labels.grid", { count: perSheet })
          }
        >
          <SegmentedControl
            label={t("labels.paper")}
            value={options.paper}
            onChange={(paper) => change({ paper })}
            options={papers.map((paper) => ({
              value: paper,
              label: paperNames[paper],
            }))}
          />
        </Choice>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("labels.also")}
          </legend>
          <ul className="divide-y rounded-md border">
            <CheckRow
              checked={options.purchase}
              onCheckedChange={(purchase) => change({ purchase })}
            >
              {t("labels.purchasePrice")}
            </CheckRow>
            <CheckRow
              checked={options.marketValue}
              onCheckedChange={(marketValue) => change({ marketValue })}
            >
              {t("labels.marketValue")}
            </CheckRow>
            <CheckRow
              checked={options.qrCode && !smallSize}
              disabled={smallSize}
              onCheckedChange={(qrCode) => change({ qrCode })}
            >
              {t("labels.qrCode")}
            </CheckRow>
          </ul>
          {smallSize && (
            <p className="text-xs text-muted-foreground">
              {t("labels.qrCodeSmall")}
            </p>
          )}
        </fieldset>
        <div className="flex items-start gap-2">
          <Checkbox
            id={perPieceId}
            checked={options.perPiece}
            onCheckedChange={(state) => change({ perPiece: state === true })}
            className="mt-0.5"
          />
          <label htmlFor={perPieceId} className="text-ui leading-5">
            {t("labels.perPiece")}
          </label>
        </div>
        <Field id={skipId} label={t("labels.skip")}>
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={0}
              max={perSheet - 1}
              step={1}
              value={skipText}
              onChange={(event) => setSkipText(event.target.value)}
              className="w-24"
            />
          )}
        </Field>
        <p aria-live="polite" className="text-ui">
          {labels === undefined
            ? t("labels.perPieceSummary")
            : t("labels.summary", {
                labels: t("labels.labelCount", { count: labels }),
                sheets: t("labels.sheetCount", {
                  count: sheetsFor(layout, skip, labels),
                }),
              })}
        </p>
        {tooMany && (
          <p className="text-xs text-destructive">
            {t("labels.tooMany", { limit })}
          </p>
        )}
        {failed && (
          <p role="alert" className="text-xs text-destructive">
            {failed}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t("labels.cancel")}
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={busy || tooMany || items === 0 || usage === undefined}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download strokeWidth={1.75} aria-hidden="true" />
          )}
          {t("labels.download")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** A choice with its label above and a hint below. */
function Choice({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* The control names itself to screen readers. */}
      <span
        aria-hidden="true"
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </span>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function CheckRow({
  checked,
  disabled,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex h-9 items-center gap-2 px-3 text-ui transition-colors duration-100",
          disabled
            ? "cursor-not-allowed text-muted-foreground"
            : "cursor-pointer hover:bg-muted",
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        {children}
      </label>
    </li>
  );
}
