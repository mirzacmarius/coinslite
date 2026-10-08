import { Banknote, Coins, Stamp } from "lucide-react";
import { cn } from "../utils";

export type ItemType = "coin" | "banknote" | "stamp";

const icons = { coin: Coins, banknote: Banknote, stamp: Stamp } as const;

/** The round badge used wherever an Item has no photo: one icon per Item type. */
export function ItemTypeIcon({
  type,
  className,
}: {
  type: ItemType;
  className?: string;
}) {
  const Icon = icons[type];
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
