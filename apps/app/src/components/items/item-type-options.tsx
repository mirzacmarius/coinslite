"use client";

import { useI18n } from "@/locales/client";
import { itemTypeIcons, itemTypes } from "./item-fields";

/** The three Item types to pick from, each with its name and icon, in the order people pick them. */
export function useItemTypeOptions() {
  const t = useI18n();
  return itemTypes.map((type) => {
    const Icon = itemTypeIcons[type];
    return {
      value: type,
      label: t(`items.types.${type}`),
      icon: <Icon strokeWidth={1.75} aria-hidden="true" />,
    };
  });
}
