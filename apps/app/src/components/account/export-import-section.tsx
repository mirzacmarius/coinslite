"use client";

import { ImportDialog } from "@/components/collection/import-dialog";
import { useExportFile } from "@/components/collection/use-export-file";
import { localToday } from "@/components/items/item-fields";
import { saveFile } from "@/lib/save-file";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { SettingsGroup, SettingsRow } from "@coinslite/ui/settings-group";
import { useConvex } from "convex/react";
import { FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { useId, useState } from "react";

/**
 * Account's Export and import, on both plans: bringing Items in from a CSV
 * file (a spreadsheet saved as CSV, or a list from another collecting app),
 * and the whole Collection, sold Items too, as a CSV file a spreadsheet
 * opens, so a collector's data can always leave with them.
 */
export function ExportImportSection() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const convex = useConvex();
  const { pending, exportFile } = useExportFile();
  const [importing, setImporting] = useState(false);
  const importHintId = useId();
  const exportHintId = useId();

  const exportCsv = () =>
    exportFile(async () => {
      const csv = await convex.query(api.collection.exports.csv, { locale });
      saveFile(t("collectionExport.fileName", { date: localToday() }), [csv]);
    });

  return (
    <>
      <SettingsGroup title={t("account.data.title")}>
        <SettingsRow
          label={t("collectionImport.title")}
          description={t("account.data.importHint")}
          descriptionId={importHintId}
        >
          <Button
            variant="outline"
            aria-describedby={importHintId}
            onClick={() => setImporting(true)}
          >
            <FileUp strokeWidth={1.75} aria-hidden="true" />
            {t("collectionImport.menuItem")}
          </Button>
        </SettingsRow>
        <SettingsRow
          label={t("account.data.export")}
          description={t("account.data.exportHint")}
          descriptionId={exportHintId}
        >
          <Button
            variant="outline"
            aria-describedby={exportHintId}
            disabled={pending}
            onClick={() => void exportCsv()}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet strokeWidth={1.75} aria-hidden="true" />
            )}
            {t("collectionExport.csv")}
          </Button>
        </SettingsRow>
      </SettingsGroup>
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </>
  );
}
