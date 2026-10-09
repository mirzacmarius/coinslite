import type { ItemType } from "@coinslite/ui/item-type-icon";
import { Banknote, Coins, type LucideIcon, Stamp } from "lucide-react";

/** The three Item types, in the order people pick them. */
export const itemTypes: ItemType[] = ["coin", "banknote", "stamp"];

export const itemTypeIcons: Record<ItemType, LucideIcon> = {
  coin: Coins,
  banknote: Banknote,
  stamp: Stamp,
};

/** Today in the person's time zone, as "YYYY-MM-DD": the latest purchase date. */
export function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
