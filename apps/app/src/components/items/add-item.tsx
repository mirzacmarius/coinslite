"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Kbd } from "@coinslite/ui/kbd";
import { Plus } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { AddItemDialog } from "./add-item-dialog";

const AddItemContext = createContext<() => void>(() => {});

/** Opens the "New Item" dialog from anywhere in the app. */
export const useAddItem = () => useContext(AddItemContext);

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Holds the one "New Item" dialog; C opens it unless someone is typing. */
export function AddItemProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "c" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTyping(event.target) &&
        // A dialog that's still fading out doesn't count.
        !document.querySelector('[role=dialog][data-state="open"]')
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <AddItemContext.Provider value={() => setOpen(true)}>
      {children}
      <AddItemDialog open={open} onOpenChange={setOpen} />
    </AddItemContext.Provider>
  );
}

/** The sidebar's first quick action. */
export function AddItemQuickAction() {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <Button variant="subtle" className="w-full justify-start" onClick={addItem}>
      <Plus aria-hidden="true" />
      {t("items.add")}
      <Kbd className="ml-auto">C</Kbd>
    </Button>
  );
}
