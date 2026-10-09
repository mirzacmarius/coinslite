import { type ItemType, ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { cn } from "@coinslite/ui/utils";

/** An Item's list thumbnail: its front or back photo, else its Item type's tile. */
export function ItemThumbnail({
  type,
  url,
  className,
}: {
  type: ItemType;
  url: string | null;
  className?: string;
}) {
  if (!url) return <ItemTypeIcon type={type} className={className} />;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        "size-8 shrink-0 rounded-md border bg-muted object-cover",
        className,
      )}
    />
  );
}
