"use client";

import type { ScanPreset } from "@/components/scanner/scan-preset";
import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import { Kbd } from "@coinslite/ui/kbd";
import { SidebarMenuButton, SidebarMenuItem } from "@coinslite/ui/sidebar";
import { Plus } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { ItemFormDialog } from "./item-form-dialog";

/** What the "New Item" dialog opens with. */
export type NewItemPreset = {
  /** The Item type already chosen, as the coin scanner does. */
  type?: ItemType;
  /** A coin scan's photos and suggestion, for the person to review (scanner/scan-coin.tsx). */
  scan?: ScanPreset;
};

const AddItemContext = createContext<(preset?: NewItemPreset) => void>(
  () => {},
);

/**
 * Opens the "New Item" dialog from anywhere in the app: `addItem()`, or with
 * a coin scan to review, `addItem({ type: "coin", scan })`.
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

/**
 * The sidebar's first quick action, in the accent colour and taller than
 * the rows below it: from tablet width up the one Add Item button, as pages
 * show theirs on phones only, where there's no sidebar.
 */
export function AddItemQuickAction() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={t("items.add")}
        className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
        onClick={() => addItem()}
      >
        <Plus aria-hidden="true" />
        <span>{t("items.add")}</span>
        <Kbd className="ml-auto border-primary-foreground/40 bg-transparent text-primary-foreground group-data-[collapsible=icon]:hidden">
          C
        </Kbd>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
