"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { ActionLabel } from "@coinslite/ui/header-bar";
import { useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { CatalogNodeSheet } from "./catalog-node-sheet";

/**
 * Admins edit a Catalog entry right from its page, in the same sheet as the
 * Catalog editor. Shows nothing to anyone else.
 */
export function CatalogEntryEdit({ entryKey }: { entryKey: string }) {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  // Each opening mounts the sheet afresh, so it starts from the entry.
  const [sheet, setSheet] = useState({ open: false, session: 0 });
  if (!isAdmin) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="xs"
        onClick={() =>
          setSheet((current) => ({ open: true, session: current.session + 1 }))
        }
      >
        <Pencil strokeWidth={1.75} aria-hidden="true" />
        <ActionLabel>{t("catalogEditor.editEntry")}</ActionLabel>
      </Button>
      <CatalogNodeSheet
        key={sheet.session}
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        target={{ mode: "edit", key: entryKey }}
      />
    </>
  );
}
