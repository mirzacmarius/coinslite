"use client";

import type { ScanPreset } from "@/components/scanner/scan-preset";
import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import { Kbd } from "@coinslite/ui/kbd";
import { SidebarMenuButton, SidebarMenuItem } from "@coinslite/ui/sidebar";
import { Plus } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { ItemFormDialog } from "./item-form-dialog";

/** What the "New Item" dialog opens with. */
export type NewItemPreset = {
  /** The Item type already chosen, as the Overview's "Add banknote" does. */
  type?: ItemType;
  /** A coin scan's photos and suggestion, for the person to review (scanner/scan-coin.tsx). */
  scan?: ScanPreset;
};

const AddItemContext = createContext<(preset?: NewItemPreset) => void>(
  () => {},
);

/**
 * Opens the "New Item" dialog from anywhere in the app, optionally with its
 * Item type already chosen: `addItem()` or `addItem({ type: "stamp" })`.
 */
export const useAddItem = () => useContext(AddItemContext);

/** Holds the one "New Item" dialog; C opens it (lib/use-shortcut.ts). */
export function AddItemProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<NewItemPreset>({});
  const addItem = useCallback((next: NewItemPreset = {}) => {
    setPreset(next);
    setOpen(true);
  }, []);
  useShortcut("c", addItem);
  return (
    <AddItemContext.Provider value={addItem}>
      {children}
      <ItemFormDialog
        open={open}
        onOpenChange={setOpen}
        newItemType={preset.type}
        scan={preset.scan}
      />
    </AddItemContext.Provider>
  );
}

/** The sidebar's first quick action. */
export function AddItemQuickAction() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={t("items.add")}
        className="border bg-card text-foreground hover:bg-card hover:text-foreground hover:shadow-sm group-data-[collapsible=icon]:border-0"
        onClick={() => addItem()}
      >
        <Plus aria-hidden="true" />
        <span>{t("items.add")}</span>
        <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">C</Kbd>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
