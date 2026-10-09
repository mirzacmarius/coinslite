import { type ItemType, ItemTypeIcon } from "@coinslite/ui/item-type-icon";

/** An Item's list thumbnail: its front or back photo, else its Item type's tile. */
export function ItemThumbnail({
  type,
  url,
}: {
  type: ItemType;
  url: string | null;
}) {
  if (!url) return <ItemTypeIcon type={type} />;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      className="size-8 shrink-0 rounded-md border bg-muted object-cover"
    />
  );
}
