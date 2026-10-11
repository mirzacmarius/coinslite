"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useMutation } from "convex/react";
import { FolderOpen } from "lucide-react";
import { AlbumDot } from "./album-colours";
import { useAlbumError, useAlbums } from "./use-albums";

/**
 * The Album pill on the Item form: pick one of the person's Albums, none, or
 * type a new name to create that Album on the spot.
 */
export function AlbumPicker({
  value,
  onChange,
  onCreateFailed,
}: {
  value: Id<"albums"> | undefined;
  onChange: (albumId: Id<"albums"> | undefined) => void;
  onCreateFailed: (message: string) => void;
}) {
  const t = useI18n();
  const albums = useAlbums();
  const createAlbum = useMutation(api.albums.create);
  const albumError = useAlbumError();
  const options = (albums ?? []).map((album) => ({
    value: album._id,
    label: album.name,
    icon: <AlbumDot colour={album.colour} />,
    count: album.ownedItemCount,
  }));

  return (
    <PropertyPicker
      icon={FolderOpen}
      label={t("albums.album")}
      placeholder={t("albums.addToAlbum")}
      value={value}
      options={options}
      onChange={onChange}
      onClear={() => onChange(undefined)}
      clearLabel={t("albums.noAlbum")}
      noResults={t("items.noMatches")}
      createLabel={(name) => t("albums.createNamed", { name })}
      onCreate={async (name) => {
        try {
          onChange(await createAlbum({ name }));
        } catch (failure) {
          onCreateFailed(albumError(failure, t("albums.errors.createFailed")));
        }
      }}
    />
  );
}
