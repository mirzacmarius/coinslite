"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { albumErrors } from "@coinslite/backend/convex/albums/rules";
import {
  type ImportTable,
  dateOrderIn,
  guessColumns,
  laidOutAsExport,
  needsItemType,
  readTable,
} from "@coinslite/backend/convex/collection/importColumns";
import {
  type ImportRow,
  importErrors,
  importLimits,
  rowErrors,
} from "@coinslite/backend/convex/collection/importRows";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { bulkLimits } from "@coinslite/backend/convex/items/bulkRules";
import { suggestionLimits } from "@coinslite/backend/convex/items/catalogSuggestions";
import { itemErrors } from "@coinslite/backend/convex/items/rules";
import { tagErrors } from "@coinslite/backend/convex/items/tags";
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
import { IconButton } from "@coinslite/ui/icon-button";
import { toast } from "@coinslite/ui/toaster";
import { useAction, useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { type ImportChoices, ImportColumns } from "./import-columns";

type Preview = FunctionReturnType<typeof api.collectionImport.preview>;
type Suggested = FunctionReturnType<typeof api.catalogSuggestions.forItems>;

/** A file picked for import, read in the browser. */
type PickedFile = { fileName: string; text: string; table: ImportTable };

type Stage =
  | { stage: "pick"; error?: string }
  | { stage: "reading" }
  | {
      stage: "columns";
      file: PickedFile;
      choices: ImportChoices;
      error?: string;
    }
  | {
      stage: "preview";
      file: PickedFile;
      choices: ImportChoices;
      preview: Preview;
      error?: string;
    }
  | { stage: "importing"; done: number; total: number }
  | { stage: "finding"; added: number }
  | {
      stage: "linking";
      added: number;
      suggested: Suggested;
      ticked: ReadonlySet<Id<"items">>;
      reviewing: boolean;
      busy: boolean;
    };

/** Splits a list into runs of at most `size`, for calls that take that many. */
const chunks = <T,>(list: readonly T[], size: number) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, index) =>
    list.slice(index * size, (index + 1) * size),
  );

/**
 * A file's text: UTF-8, or Windows-1252 for one an older Windows program
 * saved, which UTF-8 can't read.
 */
async function fileText(file: File) {
  const bytes = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(bytes);
  return text.includes("\uFFFD")
    ? new TextDecoder("windows-1252").decode(bytes)
    : text;
}

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
  [tagErrors.tooMany]: "tooManyTags",
  [tagErrors.tooLong]: "tooLong",
} as const;

/**
 * Import Items from a CSV file: pick a file; for one not laid out like the
 * Collection export (from Numista, OpenNumismat, CoinManage or a
 * spreadsheet), check the columns as guessed; see what would be added and
 * what's rejected and why, then add the rows a batch at a time. On the
 * Free plan a file that doesn't fit offers its first rows that do, or the
 * way to Premium.
 */
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const preview = useAction(api.collectionImport.preview);
  const importBatch = useMutation(api.collectionImport.importBatch);
  const linkMany = useMutation(api.catalogSuggestions.linkMany);
  const convex = useConvex();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<Stage>({ stage: "pick" });
  // Counts closings, so a look-up still running when the dialog is closed
  // doesn't reopen it on a stale state.
  const closings = useRef(0);
  // Looking for Catalog entries can be left: the Items are in.
  const busy =
    state.stage === "reading" ||
    state.stage === "importing" ||
    (state.stage === "linking" && state.busy);

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
      case importErrors.invalidColumns:
        return t("collectionImport.errors.invalidColumns");
      default:
        return t("collectionImport.errors.failed");
    }
  };

  /**
   * Reads the file in the browser and guesses its columns. A Collection
   * export goes straight to the preview; any other file shows its columns
   * to check first.
   */
  const read = async (file: File) => {
    if (file.size > importLimits.fileSize) {
      setState({ stage: "pick", error: fileError(importErrors.fileTooLarge) });
      return;
    }
    setState({ stage: "reading" });
    const text = await fileText(file);
    const table = readTable(text);
    if (typeof table === "string") {
      setState({ stage: "pick", error: fileError(table) });
      return;
    }
    const columns = guessColumns(table.headings, table.records);
    const dates = dateOrderIn(table, columns);
    const picked = { fileName: file.name, text, table };
    const choices: ImportChoices = {
      columns,
      itemType: "coin",
      dateOrder: dates.order ?? "dmy",
    };
    if (
      laidOutAsExport(table.headings, columns) &&
      !needsItemType(table, columns) &&
      !dates.unclear
    )
      await previewOf(picked, choices);
    else setState({ stage: "columns", file: picked, choices });
  };

  /** What the file would add, read by the columns chosen. */
  const previewOf = async (file: PickedFile, choices: ImportChoices) => {
    setState({ stage: "reading" });
    try {
      const result = await preview({
        text: file.text,
        columns: choices.columns,
        itemType: choices.itemType,
        dateOrder: choices.dateOrder,
        locale,
      });
      setState({ stage: "preview", file, choices, preview: result });
    } catch (failure) {
      setState({
        stage: "columns",
        file,
        choices,
        error: fileError(
          failure instanceof ConvexError ? failure.data : undefined,
        ),
      });
    }
  };

  const run = async (current: Extract<Stage, { stage: "preview" }>) => {
    const rows = rowsThatFit(current.preview.rows, current.preview.itemsLeft);
    let done = 0;
    const itemIds: Id<"items">[] = [];
    setState({ stage: "importing", done, total: rows.length });
    try {
      for (const batch of chunks(rows, importLimits.batch)) {
        const added = await importBatch({ rows: batch });
        itemIds.push(...added);
        done += added.length;
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
    setState({ stage: "finding", added: done });
    const opened = closings.current;
    const suggested = await suggestionsFor(itemIds);
    if (closings.current !== opened) return;
    if (suggested.length === 0) {
      setState({ stage: "pick" });
      onOpenChange(false);
      return;
    }
    setState({
      stage: "linking",
      added: done,
      suggested,
      ticked: new Set(suggested.map(({ itemId }) => itemId)),
      reviewing: false,
      busy: false,
    });
  };

  /**
   * The best Catalog entry for each imported Item that has one. A look-up
   * that fails just suggests less: the Items are imported either way.
   */
  const suggestionsFor = async (itemIds: Id<"items">[]) => {
    const found = await Promise.all(
      chunks(itemIds, suggestionLimits.items).map((chunk) =>
        convex
          .query(api.catalogSuggestions.forItems, { itemIds: chunk })
          .catch((): Suggested => []),
      ),
    );
    return found.flat();
  };

  const link = async (current: Extract<Stage, { stage: "linking" }>) => {
    const links = current.suggested
      .filter(({ itemId }) => current.ticked.has(itemId))
      .map(({ itemId, entry }) => ({ itemId, catalogEntryKey: entry.key }));
    setState({ ...current, busy: true });
    let linked = 0;
    try {
      for (const chunk of chunks(links, bulkLimits.items))
        linked += await linkMany({ links: chunk });
    } catch {
      // Linking again is harmless: Items already linked are left as they are.
      toast.error(t("catalogSuggestion.afterImport.failed"));
      setState({ ...current, busy: false });
      return;
    }
    toast.success(t("catalogSuggestion.afterImport.linked", { count: linked }));
    setState({ stage: "pick" });
    onOpenChange(false);
  };

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) {
      closings.current += 1;
      setState({ stage: "pick" });
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[35rem]">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-1.5 text-ui">
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
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("collectionImport.choose")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void read(file);
          }}
        />

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 py-3 text-ui">
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
          {state.stage === "columns" && (
            <>
              <ImportColumns
                fileName={state.file.fileName}
                table={state.file.table}
                choices={state.choices}
                onChange={(choices) =>
                  setState({ ...state, choices, error: undefined })
                }
              />
              {state.error && (
                <p role="alert" className="text-xs text-destructive">
                  {state.error}
                </p>
              )}
            </>
          )}
          {state.stage === "preview" && (
            <PreviewSummary
              fileName={state.file.fileName}
              preview={state.preview}
              reason={reason}
              error={state.error}
            />
          )}
          {state.stage === "finding" && (
            <>
              <p className="font-medium">
                {t("collectionImport.imported", { count: state.added })}
              </p>
              <p
                className="flex items-center gap-2 text-muted-foreground"
                aria-live="polite"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("catalogSuggestion.afterImport.finding")}
              </p>
            </>
          )}
          {state.stage === "linking" && (
            <LinkSuggestions
              state={state}
              onTick={(ticked) => setState({ ...state, ticked })}
            />
          )}
        </div>

        <DialogFooter>
          {state.stage === "preview" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setState({
                  stage: "columns",
                  file: state.file,
                  choices: state.choices,
                })
              }
            >
              {t("collectionImport.columns.check")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {state.stage === "columns" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInput.current?.click()}
                >
                  {t("collectionImport.chooseAnother")}
                </Button>
                <Button
                  type="button"
                  disabled={!state.choices.columns.some(Boolean)}
                  onClick={() => void previewOf(state.file, state.choices)}
                >
                  {t("collectionImport.columns.continue")}
                </Button>
              </>
            ) : state.stage === "preview" ? (
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
            ) : state.stage === "linking" ? (
              state.reviewing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={state.busy}
                    onClick={() => setState({ ...state, reviewing: false })}
                  >
                    {t("catalogSuggestion.afterImport.back")}
                  </Button>
                  <Button
                    type="button"
                    disabled={state.busy || state.ticked.size === 0}
                    onClick={() => void link(state)}
                  >
                    {state.busy && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {t("catalogSuggestion.afterImport.confirm", {
                      count: state.ticked.size,
                    })}
                  </Button>
                </>
              ) : (
                <>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      {t("catalogSuggestion.afterImport.done")}
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={() => setState({ ...state, reviewing: true })}
                  >
                    {t("catalogSuggestion.afterImport.offer", {
                      count: state.suggested.length,
                    })}
                  </Button>
                </>
              )
            ) : (
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={busy}>
                  {state.stage === "finding"
                    ? t("catalogSuggestion.afterImport.done")
                    : t("collectionImport.cancel")}
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
      {preview.unread.countries.length > 0 && (
        <p className="text-muted-foreground">
          {t("collectionImport.unreadCountries", {
            names: preview.unread.countries.join(", "),
          })}
        </p>
      )}
      {preview.unread.grades.length > 0 && (
        <p className="text-muted-foreground">
          {t("collectionImport.unreadGrades", {
            names: preview.unread.grades.join(", "),
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

/**
 * After an import: how many Items went in and how many look like Catalog
 * entries, then, to review, one row per Item with its best entry, each
 * ticked until the person unticks it.
 */
function LinkSuggestions({
  state,
  onTick,
}: {
  state: Extract<Stage, { stage: "linking" }>;
  onTick: (ticked: ReadonlySet<Id<"items">>) => void;
}) {
  const t = useI18n();
  const { suggested, ticked } = state;
  if (!state.reviewing)
    return (
      <>
        <p className="font-medium">
          {t("collectionImport.imported", { count: state.added })}
        </p>
        <p className="text-muted-foreground">
          {t("catalogSuggestion.afterImport.offerHint")}
        </p>
      </>
    );
  const tick = (itemId: Id<"items">, on: boolean) => {
    const next = new Set(ticked);
    if (on) next.add(itemId);
    else next.delete(itemId);
    onTick(next);
  };
  return (
    <>
      <p className="text-muted-foreground">
        {t("catalogSuggestion.afterImport.reviewHint")}
      </p>
      <div className="overflow-hidden rounded-md border">
        <label className="flex h-9 cursor-pointer items-center gap-2 border-b bg-muted/40 px-3 text-muted-foreground">
          <Checkbox
            checked={
              ticked.size === suggested.length
                ? true
                : ticked.size > 0
                  ? "indeterminate"
                  : false
            }
            disabled={state.busy}
            onCheckedChange={(checked) =>
              onTick(
                checked === true
                  ? new Set(suggested.map(({ itemId }) => itemId))
                  : new Set(),
              )
            }
          />
          {t("catalogSuggestion.afterImport.all")}
        </label>
        <ul className="divide-y">
          {suggested.map(({ itemId, title, entry }) => (
            <li key={itemId}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors duration-100 hover:bg-muted">
                <Checkbox
                  checked={ticked.has(itemId)}
                  disabled={state.busy}
                  onCheckedChange={(checked) => tick(itemId, checked === true)}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.title}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
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
