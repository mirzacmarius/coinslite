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
 * The sidebar's first quick action, in the accent colour and, while the
 * sidebar is expanded, taller than the rows below it: from tablet width up
 * the Add Item button, as phones, where there's no sidebar, have theirs in
 * the tabs (AddItemTabButton). Its focus ring stands off it, which is the
 * same colour.
 */
export function AddItemQuickAction() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={t("items.add")}
        className="h-9 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground"
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

/**
 * The phones' Add Item button: round, in the accent colour, in the middle of
 * the tabs along the bottom, where a thumb reaches it on every page. Its
 * focus ring stands off it, which is the same colour.
 */
export function AddItemTabButton() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <Button
      size="icon"
      aria-label={t("items.add")}
      className="size-11 rounded-full shadow-md ring-offset-card transition-[color,background-color,transform] focus-visible:ring-offset-2 active:scale-95 [&_svg]:size-6"
      onClick={() => addItem()}
    >
      <Plus aria-hidden="true" />
    </Button>
  );
}
