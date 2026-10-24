"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  collectionExportErrors,
  collectionPdfLimits,
} from "@coinslite/backend/convex/collection/exportRules";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { planErrors } from "@coinslite/backend/convex/plans/rules";
import { toast } from "@coinslite/ui/toaster";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Making a Collection file on the server and handing it to the browser:
 * `pending` while it's made, and a message saying why when it can't be.
 */
export function useExportFile() {
  const t = useI18n();
  const format = useFormatters();
  const router = useRouter();
  const [pending, setPending] = useState(false);

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
        toast.error(
          t("collectionExport.pdfTooLarge", {
            limit: format.number(collectionPdfLimits.items),
          }),
        );
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

  return { pending, exportFile };
}
