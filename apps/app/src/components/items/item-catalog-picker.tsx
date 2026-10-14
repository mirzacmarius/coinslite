"use client";

import { CatalogPickerDialog } from "@/components/catalog/catalog-picker";
import { useSelector } from "@tanstack/react-form";
import type { ItemFormState } from "./use-item-form";

/**
 * The Item form's Catalog picker: where adding an Item starts, and where
 * the form's Catalog pill searches for an entry to link, also while an Item
 * is edited. Closing it puts the focus back on the title.
 */
export function ItemCatalogPicker({ itemForm }: { itemForm: ItemFormState }) {
  const type = useSelector(itemForm.form.store, (state) => state.values.type);
  return (
    <CatalogPickerDialog
      {...itemForm.picker}
      itemType={type}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        itemForm.titleRef.current?.focus();
      }}
    />
  );
}
