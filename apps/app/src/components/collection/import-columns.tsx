"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { exportLabels } from "@coinslite/backend/convex/collection/exportLabels";
import {
  type Column,
  type ImportTable,
  dateOrderIn,
  importColumns,
  needsItemType,
} from "@coinslite/backend/convex/collection/importColumns";
import type { DateOrder } from "@coinslite/backend/convex/collection/importValues";
import type { ItemType } from "@coinslite/backend/convex/items/grades";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@coinslite/ui/select";
import { SegmentedControl } from "@coinslite/ui/segmented-control";

/** How the file's rows are to be read: the person's choices, guessed first. */
export type ImportChoices = {
  /** Each heading's column, by its place; null leaves it out. */
  columns: (Column | null)[];
  /** The Item type of rows that have none. */
  itemType: ItemType;
  dateOrder: DateOrder;
};

/** Stands for "Leave out" in the column menus, which can't hold null. */
const leaveOut = "-";

/** What a column is called, in the app's language. */
function useColumnName() {
  const t = useI18n();
  const labels = exportLabels[useCurrentLocale()].columns;
  return (column: Column) => {
    switch (column) {
      case "unit":
        return t("collectionImport.columns.unit");
      case "series":
        return t("items.series");
      case "mint_mark":
        return t("items.mintMark");
      case "ruler":
        return t("items.ruler");
      case "mintage":
        return t("items.mintage");
      case "numista_number":
        return t("items.numistaNumber");
      case "grade_note":
        return t("items.gradeNote");
      case "notes":
        return t("items.notes");
      case "album":
        return t("albums.album");
      case "catalog_entry":
        return t("collectionImport.columns.catalogEntry");
      default:
        return labels[column];
    }
  };
}

/** A few of a column's cells, so the person sees what it holds. */
function samplesOf(table: ImportTable, at: number) {
  const found = new Set<string>();
  for (const record of table.records) {
    const cell = record[at]?.trim();
    if (cell) found.add(cell);
    if (found.size === 3) break;
  }
  return [...found];
}

/**
 * Checking a file's columns before it's read: each heading with what its
 * cells hold and the field it goes to, as guessed; the Item type of rows
 * without one; and how its dates put day and month, when they don't show.
 */
export function ImportColumns({
  fileName,
  table,
  choices,
  onChange,
}: {
  fileName: string;
  table: ImportTable;
  choices: ImportChoices;
  onChange: (choices: ImportChoices) => void;
}) {
  const t = useI18n();
  const columnName = useColumnName();
  const { columns } = choices;
  // A field goes to one heading: choosing it for another moves it there.
  const choose = (at: number, column: Column | null) =>
    onChange({
      ...choices,
      columns: columns.map((current, index) =>
        index === at
          ? column
          : column !== null && current === column
            ? null
            : current,
      ),
    });
  // Headings can repeat and the file doesn't change: a column is its place.
  const places = table.headings
    .map((heading, at) => ({ heading, at }))
    .filter(({ heading }) => heading.trim() !== "");
  const typeNeeded = needsItemType(table, columns);
  const dates = dateOrderIn(table, columns);

  return (
    <>
      <p className="truncate text-xs text-muted-foreground">{fileName}</p>
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{t("collectionImport.columns.title")}</p>
        <p className="text-muted-foreground">
          {t("collectionImport.columns.hint")}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border">
        <div
          aria-hidden="true"
          className="grid grid-cols-2 gap-3 border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <span>{t("collectionImport.columns.inFile")}</span>
          <span>{t("collectionImport.columns.inCoinsLite")}</span>
        </div>
        <ul className="divide-y">
          {places.map(({ heading, at }) => {
            const samples = samplesOf(table, at);
            return (
              <li
                key={at}
                className="grid grid-cols-2 items-center gap-3 px-3 py-1.5"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{heading}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {samples.length > 0
                      ? samples.join(" · ")
                      : t("collectionImport.columns.empty")}
                  </span>
                </span>
                <Select
                  value={columns[at] ?? leaveOut}
                  onValueChange={(value) =>
                    choose(at, value === leaveOut ? null : (value as Column))
                  }
                >
                  <SelectTrigger
                    aria-label={t("collectionImport.columns.fieldFor", {
                      heading,
                    })}
                    className="h-7 text-ui"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={leaveOut}>
                      {t("collectionImport.columns.leaveOut")}
                    </SelectItem>
                    {importColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {columnName(column)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
        </ul>
      </div>
      {typeNeeded && (
        <div className="flex flex-col gap-1.5">
          <span
            aria-hidden="true"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("collectionImport.columns.itemType")}
          </span>
          <SegmentedControl
            label={t("collectionImport.columns.itemType")}
            value={choices.itemType}
            onChange={(itemType) => onChange({ ...choices, itemType })}
            options={(["coin", "banknote", "stamp"] as const).map((type) => ({
              value: type,
              label: t(`items.types.${type}`),
            }))}
          />
        </div>
      )}
      {dates.unclear && (
        <div className="flex flex-col gap-1.5">
          <span
            aria-hidden="true"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("collectionImport.columns.dateOrder")}
          </span>
          <SegmentedControl
            label={t("collectionImport.columns.dateOrder")}
            value={choices.dateOrder}
            onChange={(dateOrder) => onChange({ ...choices, dateOrder })}
            options={[
              { value: "dmy", label: t("collectionImport.columns.dayFirst") },
              { value: "mdy", label: t("collectionImport.columns.monthFirst") },
            ]}
          />
        </div>
      )}
    </>
  );
}
