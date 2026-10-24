"use client";

import { LabelsDialog } from "@/components/labels/labels-dialog";
import { upgradeHref } from "@/components/plans/plan-usage";
import { saveFile } from "@/lib/save-file";
import { useHydrated } from "@/lib/use-hydrated";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { collectionPdfLimits } from "@coinslite/backend/convex/collection/exportRules";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { useAction, useQuery } from "convex/react";
import { FileText, Loader2, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useExportFile } from "./use-export-file";

/**
 * The Collection toolbar's Print menu, for the view on screen (its search,
 * filters and sort), on Premium: a PDF list of its Items that the server
 * makes, and labels to print for them. The Free plan's menu shows the way
 * to Premium instead. A Collection too large to read whole isn't printed
 * at all, rather than with Items missing. Exporting the whole Collection
 * and importing are on Account.
 */
export function PrintMenu({
  view,
  count,
  pieces,
  complete,
}: {
  view: CollectionView;
  /** How many Items the view shows. */
  count: number;
  /** How many pieces those Items hold. */
  pieces: number;
  /** False when the Collection was too large to read whole. */
  complete: boolean;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const downloadPdf = useAction(api.collectionPdf.download);
  const format = useFormatters();
  const usage = useQuery(api.plans.usage);
  // The sidebar asks too, so the first render must match the server's HTML.
  const hydrated = useHydrated();
  const plan = hydrated ? usage?.plan : undefined;
  const { pending, exportFile } = useExportFile();
  const [labelling, setLabelling] = useState(false);

  const tooLargeForPdf = count > collectionPdfLimits.items;

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
    <>
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
              <Printer strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {t("collectionExport.print")}
            </span>
            <span className="sr-only sm:hidden">
              {t("collectionExport.print")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[15rem]">
          <DropdownMenuLabel className="font-normal">
            {t("collectionExport.inView", { count })}
          </DropdownMenuLabel>
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
              <DropdownMenuItem
                disabled={
                  plan !== "premium" ||
                  count === 0 ||
                  tooLargeForPdf ||
                  !complete
                }
                onSelect={() => void exportPdf()}
              >
                <FileText strokeWidth={1.75} />
                {t("collectionExport.pdf")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={plan !== "premium" || count === 0 || !complete}
                onSelect={() => setLabelling(true)}
              >
                <Printer strokeWidth={1.75} />
                {t("labels.menuItem")}
              </DropdownMenuItem>
              {complete && tooLargeForPdf && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t("collectionExport.pdfTooLarge", {
                    limit: format.number(collectionPdfLimits.items),
                  })}
                </p>
              )}
            </>
          )}
          {!complete && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("collectionExport.tooLarge")}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <LabelsDialog
        open={labelling}
        onOpenChange={setLabelling}
        source={{ kind: "view", view }}
        description={t("labels.forView", { count })}
        items={count}
        pieces={pieces}
      />
    </>
  );
}
