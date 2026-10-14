"use client";

import { useCatalogVisible } from "@/components/catalog/use-catalog-visible";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useSelector } from "@tanstack/react-form";
import { BookOpen } from "lucide-react";
import { isCatalogType, itemTypeIcons } from "./item-fields";
import { useItemFields } from "./item-form-fields";
import type { LinkedEntry } from "./item-form-submit";
import { useItemTypeOptions } from "./item-type-options";

/**
 * The Item form's first pills: the Catalog entry it's linked to, else the
 * Item type, and for a new coin or banknote not linked yet, a way to pick
 * one from the Catalog (`onPick` opens the picker).
 */
export function CatalogLink({
  linked,
  editing,
  onPick,
}: {
  linked: LinkedEntry | undefined;
  /** Editing an existing Item, whose link stays. */
  editing: boolean;
  onPick: () => void;
}) {
  const t = useI18n();
  const { form } = useItemFields();
  const type = useSelector(form.store, (state) => state.values.type);
  const catalogVisible = useCatalogVisible();
  const typeOptions = useItemTypeOptions();
  return (
    <>
      {linked ? (
        <CatalogEntryPill
          title={linked.title}
          label={t("catalogPicker.entry")}
          onClick={editing ? undefined : onPick}
        />
      ) : (
        <form.Field name="type">
          {(field) => (
            <PropertyPicker
              icon={itemTypeIcons[field.state.value]}
              label={t("items.type")}
              value={field.state.value}
              options={typeOptions}
              onChange={field.handleChange}
              noResults={t("items.noMatches")}
            />
          )}
        </form.Field>
      )}
      {!editing && !linked && catalogVisible && isCatalogType(type) && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`${t("catalogPicker.entry")}: ${t("catalogPicker.pick")}`}
          onClick={onPick}
        >
          <BookOpen strokeWidth={1.75} aria-hidden="true" />
          {t("catalogPicker.pick")}
        </Button>
      )}
    </>
  );
}

/**
 * The Catalog entry a new Item is linked to, in place of the Item type pill
 * (the entry decides the type); clicking it picks another. Not a button on
 * an existing Item, whose link stays.
 */
function CatalogEntryPill({
  title,
  label,
  onClick,
}: {
  title: string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <BookOpen strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{title}</span>
    </>
  );
  if (!onClick) {
    return (
      <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md bg-muted px-2 text-[13px] font-medium [&_svg]:size-4 [&_svg]:shrink-0">
        <span className="sr-only">{label}: </span>
        {content}
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="subtle"
      size="xs"
      aria-label={`${label}: ${title}`}
      className="max-w-full justify-start"
      onClick={onClick}
    >
      {content}
    </Button>
  );
}
