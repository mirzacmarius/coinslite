"use client";

import { localToday } from "@/components/items/item-fields";
import { upgradeHref } from "@/components/plans/plan-usage";
import { saveFile } from "@/lib/save-file";
import { useHydrated } from "@/lib/use-hydrated";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  collectionExportErrors,
  collectionPdfLimits,
} from "@coinslite/backend/convex/collection/exportRules";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { planErrors } from "@coinslite/backend/convex/plans/rules";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { toast } from "@coinslite/ui/toaster";
import { useAction, useConvex, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The Collection toolbar's Export and import menu. On Premium it downloads
 * the view on screen (its search, filters and sort) as a file the server
 * makes; on the Free plan it shows the way to Premium instead. One entry per
 * file format: CSV for spreadsheets, PDF for printing. A Collection too
 * large to read whole isn't exported at all, rather than with Items missing.
 * Importing from a CSV file is on both plans.
 */
export function ExportMenu({
  view,
  count,
  complete,
  onImport,
}: {
  /** Opens the Import dialog. */
  onImport: () => void;
  view: CollectionView;
  /** How many Items the view shows. */
  count: number;
  /** False when the Collection was too large to read whole. */
  complete: boolean;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const convex = useConvex();
  const downloadPdf = useAction(api.collectionPdf.download);
  const format = useFormatters();
  const router = useRouter();
  const usage = useQuery(api.plans.usage);
  // The sidebar asks too, so the first render must match the server's HTML.
  const hydrated = useHydrated();
  const plan = hydrated ? usage?.plan : undefined;
  const [pending, setPending] = useState(false);

  const pdfLimit = format.number(collectionPdfLimits.items);
  const tooLargeForPdf = count > collectionPdfLimits.items;

  /** Makes a file on the server and hands it to the browser. */
  const exportFile = async (make: () => Promise<void>) => {
    setPending(true);
    try {
      await make();
    } catch (failure) {
      const code = failure instanceof ConvexError ? failure.data : undefined;
      if (code === planErrors.premiumRequired) {
        toast.error(t("collectionExport.premiumOnly"), {
          action: {
            label: t("plans.upgradeToPremium"),
            onClick: () => router.push(upgradeHref),
          },
        });
      } else if (code === collectionExportErrors.tooManyItems) {
        toast.error(t("collectionExport.pdfTooLarge", { limit: pdfLimit }));
      } else if (code === collectionExportErrors.incomplete) {
        toast.error(t("collectionExport.tooLarge"));
      } else if (code === homeCurrencyErrors.changing) {
        toast.error(t("homeCurrency.busy"));
      } else {
        toast.error(t("collectionExport.failed"));
      }
    } finally {
      setPending(false);
    }
  };

  const exportCsv = () =>
    exportFile(async () => {
      const csv = await convex.query(api.collection.exports.csv, {
        view,
        locale,
      });
      saveFile(t("collectionExport.fileName", { date: localToday() }), [csv]);
    });

  const exportPdf = () =>
    exportFile(async () => {
      const { fileName, pdf } = await downloadPdf({
        view,
        locale,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      saveFile(fileName, [pdf], "application/pdf");
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{t("collectionExport.menu")}</span>
          <span className="sr-only sm:hidden">
            {t("collectionExport.menu")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        {plan === "free" ? (
          <>
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("collectionExport.premiumOnly")}
            </p>
            <DropdownMenuItem asChild>
              <Link href={upgradeHref}>
                <Sparkles strokeWidth={1.75} />
                {t("plans.upgradeToPremium")}
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="font-normal">
              {t("collectionExport.inView", { count })}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={plan !== "premium" || count === 0 || !complete}
              onSelect={() => void exportCsv()}
            >
              <FileSpreadsheet strokeWidth={1.75} />
              {t("collectionExport.csv")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={
                plan !== "premium" || count === 0 || tooLargeForPdf || !complete
              }
              onSelect={() => void exportPdf()}
            >
              <FileText strokeWidth={1.75} />
              {t("collectionExport.pdf")}
            </DropdownMenuItem>
            {!complete ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {t("collectionExport.tooLarge")}
              </p>
            ) : (
              tooLargeForPdf && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t("collectionExport.pdfTooLarge", { limit: pdfLimit })}
                </p>
              )
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImport}>
          <FileUp strokeWidth={1.75} />
          {t("collectionImport.menuItem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
