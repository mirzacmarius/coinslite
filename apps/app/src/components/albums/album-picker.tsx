"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { cn } from "@coinslite/ui/utils";
import { useMutation } from "convex/react";
import { FolderOpen, Loader2 } from "lucide-react";
import { AlbumDot } from "./album-colours";
import { useAlbumError, useAlbums } from "./use-albums";

/** An Album as picked: its name too, as a new one isn't listed yet. */
export type PickedAlbum = { _id: Id<"albums">; name: string };

/**
 * The person's Albums as a picker's options, and the way to create one from
 * a typed name, which then counts as picked.
 */
function useAlbumOptions(
  onPick: (album: PickedAlbum) => void,
  onCreateFailed: (message: string) => void,
) {
  const t = useI18n();
  const albums = useAlbums();
  const createAlbum = useMutation(api.albums.create);
  const albumError = useAlbumError();
  return {
    albums,
    choices: {
      options: (albums ?? []).map((album) => ({
        value: album._id,
        label: album.name,
        icon: <AlbumDot colour={album.colour} />,
        count: album.ownedItemCount,
      })),
      noResults: t("items.noMatches"),
      createLabel: (name: string) => t("albums.createNamed", { name }),
      onCreate: async (name: string) => {
        try {
          onPick({ _id: await createAlbum({ name }), name });
        } catch (failure) {
          onCreateFailed(albumError(failure, t("albums.errors.createFailed")));
        }
      },
    },
  };
}

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
  const { choices } = useAlbumOptions(
    ({ _id }) => onChange(_id),
    onCreateFailed,
  );

  return (
    <PropertyPicker
      icon={FolderOpen}
      label={t("albums.album")}
      placeholder={t("albums.addToAlbum")}
      value={value}
      onChange={onChange}
      onClear={() => onChange(undefined)}
      clearLabel={t("albums.noAlbum")}
      {...choices}
    />
  );
}

/**
 * Select mode's Add to Album: picking an Album, or typing a new name to
 * create one, moves the selected Items into it at once. With `onTakeOut`
 * (some are in an Album), "Take out of Albums" comes first. Spins while
 * `moving`.
 */
export function AddToAlbumButton({
  moving,
  onPick,
  onTakeOut,
  onCreateFailed,
  className,
}: {
  moving: boolean;
  onPick: (album: PickedAlbum) => void;
  onTakeOut?: () => void;
  onCreateFailed: (message: string) => void;
  className?: string;
}) {
  const t = useI18n();
  const { albums, choices } = useAlbumOptions(onPick, onCreateFailed);

  return (
    <PropertyPicker
      action
      disabled={moving}
      icon={moving ? Loader2 : FolderOpen}
      className={cn(moving && "[&_svg]:animate-spin", className)}
      label={t("albums.album")}
      placeholder={t("albums.addToAlbum")}
      value={undefined}
      onChange={(albumId) => {
        const album = albums?.find(({ _id }) => _id === albumId);
        if (album) onPick(album);
      }}
      onClear={onTakeOut}
      clearLabel={t("collection.takeOut")}
      align="end"
      {...choices}
    />
  );
}
