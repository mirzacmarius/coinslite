"use client";

import { useAddItem } from "@/components/items/add-item";
import { itemTypeIcons, itemTypes } from "@/components/items/item-fields";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { cn } from "@coinslite/ui/utils";

/** "Add coin", "Add banknote", "Add stamp": the New Item dialog with that Item type chosen. */
export function AddShortcuts({ className }: { className?: string }) {
  const t = useI18n();
  const addItem = useAddItem();
  return (
    <fieldset
      aria-label={t("overview.addShortcuts")}
      className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}
    >
      {itemTypes.map((type) => {
        const Icon = itemTypeIcons[type];
        return (
          <Button
            key={type}
            variant="outline"
            size="xs"
            onClick={() => addItem({ type })}
          >
            <Icon strokeWidth={1.75} aria-hidden="true" />
            {t(`overview.add.${type}`)}
          </Button>
        );
      })}
    </fieldset>
  );
}
