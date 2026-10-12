"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { albumErrors } from "@coinslite/backend/convex/albums/rules";
import {
  type ImportRow,
  importErrors,
  importLimits,
  rowErrors,
} from "@coinslite/backend/convex/collection/importRows";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { itemErrors } from "@coinslite/backend/convex/items/rules";
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
import { IconButton } from "@coinslite/ui/icon-button";
import { toast } from "@coinslite/ui/toaster";
import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

type Preview = FunctionReturnType<typeof api.collectionImport.preview>;

type Stage =
  | { stage: "pick"; error?: string }
  | { stage: "reading" }
  | { stage: "preview"; fileName: string; preview: Preview; error?: string }
  | { stage: "importing"; done: number; total: number };

/** The rows that fit the plan: in file order, sold ones taking no room. */
function rowsThatFit(rows: ImportRow[], itemsLeft: number | null) {
  if (itemsLeft === null) return rows;
  let owned = 0;
  return rows.filter((row) => {
    if (row.soldOn !== undefined) return true;
    owned += 1;
    return owned <= itemsLeft;
  });
}

/** The reasons a row is left out, by the code the backend gives. */
const reasonKeys = {
  [rowErrors.unknownType]: "unknownType",
  [rowErrors.unknownScale]: "unknownScale",
  [rowErrors.invalidGrade]: "invalidGrade",
  [rowErrors.unknownStrike]: "unknownStrike",
  [itemErrors.invalidStrike]: "unknownStrike",
  [rowErrors.invalidCountry]: "invalidCountry",
  [rowErrors.invalidAmount]: "invalidAmount",
  [rowErrors.invalidNumber]: "invalidNumber",
  [itemErrors.invalidYear]: "invalidYear",
  [itemErrors.invalidQuantity]: "invalidQuantity",
  [itemErrors.invalidDate]: "invalidDate",
  [rowErrors.otherCurrency]: "otherCurrency",
  [homeCurrencyErrors.changing]: "homeCurrencyChanging",
  [rowErrors.unknownCatalogEntry]: "unknownCatalogEntry",
  [rowErrors.tooManyAlbums]: "tooManyAlbums",
  [itemErrors.titleRequired]: "titleRequired",
  [albumErrors.nameRequired]: "titleRequired",
  [itemErrors.tooLong]: "tooLong",
  [itemErrors.notForType]: "notForType",
  [itemErrors.metalRequired]: "metalRequired",
  [itemErrors.soldBeforePurchase]: "soldBeforePurchase",
} as const;

/**
 * Import Items from a CSV file laid out like the Collection export: pick a
 * file, see what would be added and what's rejected and why, then add the
 * rows a batch at a time. On the Free plan a file that doesn't fit offers
 * its first rows that do, or the way to Premium.
 */
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const format = useFormatters();
  const preview = useAction(api.collectionImport.preview);
  const addBatch = useMutation(api.collectionImport.addBatch);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<Stage>({ stage: "pick" });
  const busy = state.stage === "reading" || state.stage === "importing";

  const reason = (code: string) =>
    code in reasonKeys
      ? t(
          `collectionImport.reasons.${reasonKeys[code as keyof typeof reasonKeys]}`,
        )
      : t("collectionImport.reasons.other");

  const fileError = (code: unknown) => {
    switch (code) {
      case importErrors.fileTooLarge:
        return t("collectionImport.errors.fileTooLarge");
      case importErrors.tooManyRows:
        return t("collectionImport.errors.tooManyRows", {
          limit: format.number(importLimits.rows),
        });
      case importErrors.unreadable:
        return t("collectionImport.errors.unreadable");
      case importErrors.noRows:
        return t("collectionImport.errors.noRows");
      case importErrors.noKnownHeadings:
        return t("collectionImport.errors.noKnownHeadings");
      default:
        return t("collectionImport.errors.failed");
    }
  };

  const read = async (file: File) => {
    if (file.size > importLimits.fileSize) {
      setState({ stage: "pick", error: fileError(importErrors.fileTooLarge) });
      return;
    }
    setState({ stage: "reading" });
    try {
      const result = await preview({ text: await file.text() });
      setState({ stage: "preview", fileName: file.name, preview: result });
    } catch (failure) {
      setState({
        stage: "pick",
        error: fileError(
          failure instanceof ConvexError ? failure.data : undefined,
        ),
      });
    }
  };

  const run = async (current: Extract<Stage, { stage: "preview" }>) => {
    const rows = rowsThatFit(current.preview.rows, current.preview.itemsLeft);
    let done = 0;
    setState({ stage: "importing", done, total: rows.length });
    try {
      for (let start = 0; start < rows.length; start += importLimits.batch) {
        done += await addBatch({
          rows: rows.slice(start, start + importLimits.batch),
        });
        setState({ stage: "importing", done, total: rows.length });
      }
    } catch (failure) {
      const data = failure instanceof ConvexError ? failure.data : undefined;
      const error =
        data && typeof data === "object" && "row" in data && "reason" in data
          ? t("collectionImport.errors.stoppedAt", {
              row: String(data.row),
              reason: reason(String(data.reason)),
            })
          : t("collectionImport.errors.stopped");
      if (done > 0)
        toast.success(t("collectionImport.imported", { count: done }));
      // What went in stays in: a retry offers only the rows still to add.
      const added = new Set(rows.slice(0, done).map((row) => row.row));
      const ownedAdded = rows
        .slice(0, done)
        .filter((row) => row.soldOn === undefined).length;
      const { itemsLeft } = current.preview;
      setState({
        ...current,
        preview: {
          ...current.preview,
          rows: current.preview.rows.filter((row) => !added.has(row.row)),
          itemsLeft:
            itemsLeft === null ? null : Math.max(0, itemsLeft - ownedAdded),
        },
        error: `${error} ${t("collectionImport.errors.addedBefore", { count: done })}`,
      });
      return;
    }
    toast.success(t("collectionImport.imported", { count: done }));
    setState({ stage: "pick" });
    onOpenChange(false);
  };

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) setState({ stage: "pick" });
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <FileUp
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <DialogTitle className="truncate">
              {t("collectionImport.title")}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <IconButton
              type="button"
              label={t("collectionImport.close")}
              shortcut="Esc"
              disabled={busy}
            >
              <X />
            </IconButton>
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="px-4 text-xs text-muted-foreground">
          {t("collectionImport.description", {
            size: `${format.number(importLimits.fileSize / 1024 / 1024)} MB`,
            rows: format.number(importLimits.rows),
          })}
        </DialogDescription>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("collectionImport.choose")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void read(file);
          }}
        />

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 py-3 text-[13px]">
          {state.stage === "pick" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => fileInput.current?.click()}
              >
                <FileUp strokeWidth={1.75} aria-hidden="true" />
                {t("collectionImport.choose")}
              </Button>
              {state.error && (
                <p role="alert" className="text-xs text-destructive">
                  {state.error}
                </p>
              )}
            </>
          )}
          {state.stage === "reading" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("collectionImport.reading")}
            </p>
          )}
          {state.stage === "importing" && (
            <p
              className="flex items-center gap-2 text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("collectionImport.importing", {
                done: format.number(state.done),
                total: format.number(state.total),
              })}
            </p>
          )}
          {state.stage === "preview" && (
            <PreviewSummary
              fileName={state.fileName}
              preview={state.preview}
              reason={reason}
              error={state.error}
            />
          )}
        </div>

        <DialogFooter>
          <span />
          <div className="flex items-center gap-2">
            {state.stage === "preview" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInput.current?.click()}
                >
                  {t("collectionImport.chooseAnother")}
                </Button>
                <ConfirmButton
                  preview={state.preview}
                  onConfirm={() => void run(state)}
                />
              </>
            ) : (
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={busy}>
                  {t("collectionImport.cancel")}
                </Button>
              </DialogClose>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What the file would add, what it can't, and what fits the plan. */
function PreviewSummary({
  fileName,
  preview,
  reason,
  error,
}: {
  fileName: string;
  preview: Preview;
  reason: (code: string) => string;
  error?: string;
}) {
  const t = useI18n();
  const fitting = rowsThatFit(preview.rows, preview.itemsLeft);
  const short = fitting.length < preview.rows.length;
  return (
    <>
      <p className="truncate text-xs text-muted-foreground">{fileName}</p>
      <p className="font-medium">
        {t("collectionImport.toAdd", { count: preview.rows.length })}
      </p>
      {preview.albumsToCreate.length > 0 && (
        <p>
          {t("collectionImport.albumsToCreate", {
            count: preview.albumsToCreate.length,
          })}
          <span className="text-muted-foreground">
            {" · "}
            {preview.albumsToCreate.join(", ")}
          </span>
        </p>
      )}
      {preview.linked > 0 && (
        <p>{t("collectionImport.linked", { count: preview.linked })}</p>
      )}
      {preview.ignoredHeadings.length > 0 && (
        <p className="text-muted-foreground">
          {t("collectionImport.ignored", {
            names: preview.ignoredHeadings.join(", "),
          })}
        </p>
      )}
      {short && (
        <div className="flex flex-col items-start gap-2 rounded-md border px-3 py-2">
          <p>
            {t("collectionImport.freeLimit", {
              count: preview.itemsLeft ?? 0,
            })}
          </p>
          <Button asChild variant="ghost" size="xs">
            <Link href={upgradeHref}>
              <Sparkles strokeWidth={1.75} aria-hidden="true" />
              {t("plans.upgradeToPremium")}
            </Link>
          </Button>
        </div>
      )}
      {preview.rejected.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("collectionImport.rejected", {
              count: preview.rejected.length,
            })}
          </h3>
          <ul className="flex flex-col gap-0.5 text-xs">
            {preview.rejected.map(({ row, reason: code }) => (
              <li key={row}>
                {t("collectionImport.rowReason", {
                  row: String(row),
                  reason: reason(code),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

/** "Import 3 Items", or on a full plan "Import the first 2". */
function ConfirmButton({
  preview,
  onConfirm,
}: {
  preview: Preview;
  onConfirm: () => void;
}) {
  const t = useI18n();
  const fitting = rowsThatFit(preview.rows, preview.itemsLeft);
  const short = fitting.length < preview.rows.length;
  return (
    <Button type="button" disabled={fitting.length === 0} onClick={onConfirm}>
      {short
        ? t("collectionImport.importFirst", { count: fitting.length })
        : t("collectionImport.confirm", { count: fitting.length })}
    </Button>
  );
}
