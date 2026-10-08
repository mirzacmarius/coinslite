import { Banknote, Coins, Stamp } from "lucide-react";
import { cn } from "../utils";

export type ItemType = "coin" | "banknote" | "stamp";

const icons = { coin: Coins, banknote: Banknote, stamp: Stamp } as const;

/** The tile shown wherever an Item has no photo: one icon per Item type. */
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
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}
