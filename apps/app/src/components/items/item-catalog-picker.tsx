"use client";

import { CatalogPickerDialog } from "@/components/catalog/catalog-picker";
import { useSelector } from "@tanstack/react-form";
import { isCatalogType } from "./item-fields";
import type { ItemFormState } from "./use-item-form";

/**
 * The Item form's Catalog picker, for the form's "Pick from the Catalog"
 * and Catalog pill: it searches the Item type's entries for one to link,
 * also while an Item is edited. Closing it puts the focus back on the title.
 */
export function ItemCatalogPicker({ itemForm }: { itemForm: ItemFormState }) {
  const type = useSelector(itemForm.form.store, (state) => state.values.type);
  return (
    <CatalogPickerDialog
      {...itemForm.picker}
      itemType={isCatalogType(type) ? type : "coin"}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        itemForm.titleRef.current?.focus();
      }}
    />
  );
}
