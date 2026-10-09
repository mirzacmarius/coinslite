"use client";

import { localToday } from "@/components/items/item-fields";
import { saveFile } from "@/lib/save-file";
import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CatalogError,
  catalogLimits,
} from "@coinslite/backend/convex/catalog/fields";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import { toast } from "@coinslite/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldOff,
  Upload,
  X,
} from "lucide-react";
import { useId, useRef, useState } from "react";

/**
 * The admin's bulk tools for the Catalog: export it to CSV, and import a CSV
 * file after seeing what it will add and update, or which rows to fix.
 * Everyone else finds nothing here; the backend refuses them too.
 */
export function CatalogCsvPage() {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  return (
    <>
      <HeaderBar title={t("catalogAdmin.title")} />
      {isAdmin === false ? (
        <div className="p-4">
          <EmptyState
            icon={
              <ShieldOff
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalogAdmin.notAvailable")}
            description={t("catalogAdmin.notAvailableDescription")}
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
          {isAdmin === undefined ? (
            <div
              className="h-40 animate-pulse rounded-lg bg-muted"
              aria-hidden="true"
            />
          ) : (
            <>
              <ExportSection />
              <ImportSection />
            </>
          )}
        </div>
      )}
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-sm font-medium">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ExportSection() {
  const t = useI18n();
  const convex = useConvex();
  const [pending, setPending] = useState(false);

  const exportCatalog = async () => {
    setPending(true);
    try {
      let csv = "";
      let cursor: string | null = null;
      for (;;) {
        const page: { csv: string; isDone: boolean; continueCursor: string } =
          await convex.query(api.catalog.csv.exportPage, {
            paginationOpts: { numItems: 500, cursor },
          });
        csv += page.csv;
        if (page.isDone) break;
        cursor = page.continueCursor;
      }
      // With the byte order mark spreadsheets look for.
      saveFile(`coinslite-catalog-${localToday()}.csv`, ["\ufeff", csv]);
    } catch {
      toast.error(t("catalogAdmin.exportFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Section
      title={t("catalogAdmin.exportTitle")}
      description={t("catalogAdmin.exportDescription")}
    >
      <div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => void exportCatalog()}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download strokeWidth={1.75} aria-hidden="true" />
          )}
          {t("catalogAdmin.exportAction")}
        </Button>
      </div>
    </Section>
  );
}

type ChosenFile = { name: string; csv: string };

function ImportSection() {
  const t = useI18n();
  const { number } = useFormatters();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ChosenFile | null>(null);
  const [confirming, setConfirming] = useState(false);
  const report = useQuery(
    api.catalog.csv.preview,
    file ? { csv: file.csv } : "skip",
  );
  const importFile = useMutation(api.catalog.csv.importFile);

  const choose = async (chosen: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!chosen) return;
    // Bytes, at least as many as characters: far too big to send.
    if (chosen.size > catalogLimits.fileLength * 3) {
      toast.error(t("catalogAdmin.errors.TOO_MANY_ROWS"));
      return;
    }
    try {
      setFile({ name: chosen.name, csv: await chosen.text() });
    } catch {
      toast.error(t("catalogAdmin.readFailed"));
    }
  };

  const apply = async () => {
    if (!file) return;
    try {
      const result = await importFile({ csv: file.csv });
      if (result.applied) {
        toast.success(
          t("catalogAdmin.imported", {
            inserts: number(result.inserts),
            updates: number(result.updates),
          }),
        );
        setFile(null);
      } else {
        // The preview updates itself and lists the problems.
        toast.error(t("catalogAdmin.importBlocked"));
      }
    } catch {
      toast.error(t("catalogAdmin.importFailed"));
    }
  };

  const changes = report ? report.inserts + report.updates : 0;
  const counts = report && (
    <dl className="grid grid-cols-3 gap-2">
      {(
        [
          ["inserts", report.inserts],
          ["updates", report.updates],
          ["unchanged", report.unchanged],
        ] as const
      ).map(([key, count]) => (
        <div key={key} className="flex flex-col gap-0.5 rounded-md border p-3">
          <dt className="text-xs text-muted-foreground">
            {t(`catalogAdmin.${key}`)}
          </dt>
          <dd className="text-[15px] font-medium tabular-nums">
            {number(count)}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <Section
      title={t("catalogAdmin.importTitle")}
      description={t("catalogAdmin.importDescription")}
    >
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {file ? (
        <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-[13px]">
          <FileSpreadsheet
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate font-medium">
            {file.name}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("catalogAdmin.clearFile")}
                onClick={() => setFile(null)}
              >
                <X strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("catalogAdmin.clearFile")}</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {file && report === undefined && (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("catalogAdmin.checking")}
        </p>
      )}

      {report && counts}

      {report && report.errorCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[13px] font-medium text-destructive">
              {t("catalogAdmin.problemsTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("catalogAdmin.problemsDescription")}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">
                    {t("catalogAdmin.row")}
                  </TableHead>
                  <TableHead className="w-36">
                    {t("catalogAdmin.column")}
                  </TableHead>
                  <TableHead>{t("catalogAdmin.problem")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.errors.map((error) => (
                  <TableRow
                    key={`${error.row}-${error.column ?? ""}-${error.code}`}
                    className="last:border-b-0"
                  >
                    <TableCell className="tabular-nums">
                      {number(error.row)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {error.column}
                    </TableCell>
                    <TableCell className="py-2">
                      {t(`catalogAdmin.errors.${error.code as CatalogError}`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {report.errorCount > report.errors.length && (
            <p className="text-xs text-muted-foreground">
              {t("catalogAdmin.showingFirst", {
                shown: number(report.errors.length),
                total: number(report.errorCount),
              })}
            </p>
          )}
        </div>
      )}

      {report && report.errorCount === 0 && changes === 0 && (
        <p className="text-[13px] text-muted-foreground">
          {t("catalogAdmin.upToDate")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {file && report && report.errorCount === 0 && changes > 0 && (
          <Button onClick={() => setConfirming(true)}>
            {t("catalogAdmin.importAction")}
          </Button>
        )}
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Upload strokeWidth={1.75} aria-hidden="true" />
          {file
            ? t("catalogAdmin.chooseAnother")
            : t("catalogAdmin.chooseFile")}
        </Button>
      </div>

      {file && report && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t("catalogAdmin.confirmTitle", { file: file.name })}
          description={t("catalogAdmin.confirmDescription")}
          confirmLabel={t("catalogAdmin.importAction")}
          cancelLabel={t("catalogAdmin.cancel")}
          onConfirm={apply}
        >
          {counts}
        </ConfirmDialog>
      )}
    </Section>
  );
}
