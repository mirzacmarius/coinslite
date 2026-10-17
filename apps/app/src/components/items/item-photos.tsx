"use client";

import { useStorePhotoFile } from "@/components/items/use-store-photo-file";
import { photoThumbnail, shrinkImage } from "@/lib/shrink-image";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type PhotoSide,
  isPhotoSide,
  photoErrors,
  photoLimits,
  photoSides,
  photoSignatureLength,
  photoType,
  uploadErrors,
} from "@coinslite/backend/convex/photos/rules";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { PhotoViewer } from "@coinslite/ui/photo-viewer";
import { toast } from "@coinslite/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ImagePlus,
  ImageUp,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useId, useRef, useState } from "react";

const accept = "image/jpeg,image/png,image/webp,image/gif";

/** Coins call their sides obverse and reverse; a stamp has the stamp and its back. */
const sideNames = {
  coin: { front: "obverse", back: "reverse" },
  banknote: { front: "front", back: "back" },
  stamp: { front: "stamp", back: "back" },
} as const;

/**
 * How each Item type's two sides sit: a coin's round faces side by side as
 * squares, a banknote's wide sides one above the other, and a stamp's upright
 * ones side by side. A banknote's side without a photo is a low strip rather
 * than a wide empty frame. The more photos below always sit four to a row,
 * on the page's gutter, so two of them span a side exactly.
 */
const stages = {
  coin: { sides: "grid-cols-2", tile: "aspect-square", empty: "aspect-square" },
  banknote: { sides: "grid-cols-1", tile: "aspect-[2/1]", empty: "h-28" },
  stamp: { sides: "grid-cols-2", tile: "aspect-[4/5]", empty: "aspect-[4/5]" },
} as const;

/** A photo to remove: one side, or one of the more photos by its id. */
type Target = PhotoSide | Id<"itemPhotos">;

/**
 * The server's checks, made first in the browser so a wrong file is turned
 * away before it uploads. Returns the format to store the file as.
 */
async function checkFile(file: File) {
  if (file.size > photoLimits.bytes) {
    throw new ConvexError(photoErrors.tooLarge);
  }
  const head = await file.slice(0, photoSignatureLength).arrayBuffer();
  const type = photoType(new Uint8Array(head));
  if (!type) throw new ConvexError(photoErrors.notAnImage);
  return type;
}

/**
 * The thumbnail lists show of a photo, or undefined when this browser can't
 * make one (of a picture too large for it to read, say): the photo then
 * lists as itself, like photos from before thumbnails.
 */
async function thumbnailOf(photo: File) {
  try {
    const { thumbnail } = await shrinkImage(photo, {
      thumbnail: photoThumbnail,
    });
    return thumbnail.blob;
  } catch {
    return undefined;
  }
}

/**
 * Uploads a photo file to storage as it is, along with the thumbnail the
 * browser makes of it for lists, then has the server check both and put them
 * on the Item: on `side`, or as one more photo when no side is given.
 */
function usePhotoUpload(itemId: Id<"items">) {
  const store = useStorePhotoFile();
  const attach = useAction(api.photos.attach);
  return async (side: PhotoSide | undefined, file: File) => {
    const type = await checkFile(file);
    const thumbnail = await thumbnailOf(file);
    const [storageId, thumbnailId] = await Promise.all([
      store(file, type),
      thumbnail && store(thumbnail),
    ]);
    await attach({ itemId, side, storageId, thumbnailId });
  };
}

/**
 * An Item's photos on the page's grid: its two sides large, shaped for the
 * Item type, then up to `photoLimits.more` more as small tiles. Each can be
 * added, replaced (sides) or removed, and viewed full screen. An Item without
 * any shows one place to add them instead.
 */
export function ItemPhotos({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const photos = useQuery(api.photos.ofItem, { itemId: item._id });
  const upload = usePhotoUpload(item._id);
  const removePhoto = useMutation(api.photos.remove);
  const moreId = useId();
  const addId = useId();
  const [busy, setBusy] = useState<Record<PhotoSide | "more", boolean>>({
    front: false,
    back: false,
    more: false,
  });
  const [viewing, setViewing] = useState<number | null>(null);
  const [removal, setRemoval] = useState<{ open: boolean; target: Target }>({
    open: false,
    target: "front",
  });
  const names = sideNames[item.type];
  const stage = stages[item.type];
  const more = photos?.more ?? [];
  // Until the photos load, the Item's sides tell whether it has any.
  const hasPhotos =
    photos === undefined
      ? item.frontPhoto !== undefined || item.backPhoto !== undefined
      : Boolean(photos?.front || photos?.back || more.length > 0);
  // The compact row goes once its first photo is in. Focus on its button
  // then moves on to the photos that replace it instead of being lost.
  const section = useRef<HTMLElement>(null);
  const focusAfterRow = useRef(false);
  useEffect(() => {
    if (!hasPhotos || !focusAfterRow.current) return;
    focusAfterRow.current = false;
    if (document.activeElement && document.activeElement !== document.body)
      return;
    section.current
      ?.querySelector<HTMLElement>("button:not(:disabled)")
      ?.focus();
  }, [hasPhotos]);
  const urlOf = (side: PhotoSide) =>
    photos === undefined ? undefined : (photos?.[side] ?? null);
  const moreLabel = (n: number) => t("photos.more.label", { n });
  const shown = [
    ...photoSides.flatMap((side) => {
      const src = urlOf(side);
      return src
        ? [
            {
              key: side as Target,
              src,
              caption: t(`photos.sides.${names[side]}`),
            },
          ]
        : [];
    }),
    ...more.map((photo, at) => ({
      key: photo.id as Target,
      src: photo.url,
      caption: moreLabel(at + 1),
    })),
  ];
  const view = (key: Target) =>
    setViewing(shown.findIndex((photo) => photo.key === key));

  const add = async (side: PhotoSide | undefined, file: File) => {
    const slot = side ?? "more";
    setBusy((slots) => ({ ...slots, [slot]: true }));
    try {
      await upload(side, file);
    } catch (failure) {
      const code = failure instanceof ConvexError ? String(failure.data) : "";
      toast.error(
        code === photoErrors.tooLarge
          ? t("photos.errors.tooLarge")
          : code === photoErrors.notAnImage
            ? t("photos.errors.notAnImage")
            : code === photoErrors.tooManyPhotos
              ? t("photos.errors.tooManyPhotos", { limit: photoLimits.more })
              : code === uploadErrors.tooMany
                ? t("photos.errors.tooMany")
                : t("photos.errors.failed"),
      );
    } finally {
      setBusy((slots) => ({ ...slots, [slot]: false }));
    }
  };
  const addFromRow = (side: PhotoSide | undefined, file: File) => {
    focusAfterRow.current =
      section.current?.contains(document.activeElement) ?? false;
    void add(side, file);
  };
  const removalTitle = isPhotoSide(removal.target)
    ? t(`photos.removeTitles.${names[removal.target]}`)
    : t("photos.more.removeTitle");

  return (
    <section
      ref={section}
      aria-label={t("photos.title")}
      className="flex min-w-0 flex-col"
    >
      {hasPhotos ? (
        <div className="flex flex-col gap-4">
          <div className={cn("grid gap-4", stage.sides)}>
            {photoSides.map((side) => (
              <PhotoSlot
                key={side}
                label={t(`photos.sides.${names[side]}`)}
                url={urlOf(side)}
                busy={busy[side]}
                tile={urlOf(side) === null ? stage.empty : stage.tile}
                onFile={(file) => void add(side, file)}
                onView={() => view(side)}
                onRemove={() => setRemoval({ open: true, target: side })}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <h2 id={moreId} className="text-ui font-medium">
                {t("photos.more.title")}
              </h2>
              {photos !== undefined && more.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("photos.more.hint", { limit: photoLimits.more })}
                </p>
              )}
            </div>
            {photos !== undefined && (
              <div className="grid grid-cols-4 gap-4">
                {more.map((photo, at) => (
                  <PhotoSlot
                    key={photo.id}
                    small
                    label={moreLabel(at + 1)}
                    url={photo.url}
                    busy={false}
                    onView={() => view(photo.id)}
                    onRemove={() =>
                      setRemoval({ open: true, target: photo.id })
                    }
                  />
                ))}
                {more.length < photoLimits.more && (
                  <PhotoSlot
                    small
                    label={t("photos.more.title")}
                    labelId={moreId}
                    url={null}
                    busy={busy.more}
                    onFile={(file) => void add(undefined, file)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <fieldset
          aria-labelledby={addId}
          className="flex min-h-56 min-w-0 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 px-4 py-8 text-center"
        >
          <ItemTypeIcon
            type={item.type}
            className="size-12 rounded-xl bg-card [&_svg]:size-6"
          />
          <div className="flex flex-col gap-1">
            <span id={addId} className="text-ui-lg font-medium">
              {t("photos.addPhotos")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("photos.formats")}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {photoSides.map((side) => (
              <AddPhotoButton
                key={side}
                label={t(`photos.sides.${names[side]}`)}
                busy={busy[side]}
                onFile={(file) => addFromRow(side, file)}
              />
            ))}
            <AddPhotoButton
              label={t("photos.more.title")}
              busy={busy.more}
              onFile={(file) => addFromRow(undefined, file)}
            />
          </div>
        </fieldset>
      )}
      <PhotoViewer
        index={viewing}
        onIndexChange={setViewing}
        photos={shown}
        closeLabel={t("photos.close")}
        previousLabel={t("photos.previous")}
        nextLabel={t("photos.next")}
      />
      <ConfirmDialog
        open={removal.open}
        onOpenChange={(open) => setRemoval((current) => ({ ...current, open }))}
        title={removalTitle}
        description={t("photos.removeBody")}
        confirmLabel={t("photos.remove")}
        cancelLabel={t("photos.cancel")}
        destructive
        onConfirm={async () => {
          try {
            await removePhoto({ itemId: item._id, photo: removal.target });
          } catch {
            toast.error(t("photos.errors.removeFailed"));
          }
        }}
      />
    </section>
  );
}

/**
 * Where a photo file comes from: the file picker `pick` opens (its hidden
 * `input` must be rendered), or a file dropped on whatever takes `dropTarget`.
 * Without `onFile`, or while `busy`, it takes no file.
 */
function usePhotoFile(
  onFile: ((file: File) => void) | undefined,
  busy: boolean,
) {
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const dropTarget = {
    onDragOver: (event: React.DragEvent) => {
      if (!onFile || busy || !event.dataTransfer.types.includes("Files"))
        return;
      event.preventDefault();
      setDropping(true);
    },
    onDragLeave: () => setDropping(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files[0];
      if (file && onFile && !busy) onFile(file);
    },
  };
  const fileInput = onFile && (
    <input
      ref={input}
      type="file"
      accept={accept}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onFile(file);
      }}
    />
  );
  return {
    pick: () => input.current?.click(),
    dropping,
    dropTarget,
    fileInput,
  };
}

/**
 * One button of the compact row an Item without photos shows: it adds a photo
 * to one place (a side, or the more photos), picked or dropped on it.
 */
function AddPhotoButton({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const t = useI18n();
  const { pick, dropping, dropTarget, fileInput } = usePhotoFile(onFile, busy);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={pick}
        disabled={busy}
        aria-busy={busy}
        className={cn(dropping && "ring-2 ring-ring")}
        {...dropTarget}
      >
        {busy ? (
          <Loader2
            className="animate-spin"
            strokeWidth={1.75}
            role="img"
            aria-label={t("photos.uploading")}
          />
        ) : (
          <ImagePlus strokeWidth={1.75} aria-hidden="true" />
        )}
        {label}
      </Button>
      {fileInput}
    </>
  );
}

/**
 * One photo slot: the photo (click to view, menu to replace or remove), or a
 * tile to add one. A file can also be dropped on the tile. `url` is undefined
 * while loading. Without `onFile` the photo can only be viewed or removed;
 * without `onView` and `onRemove` the slot only adds. `small` tiles (the more
 * photos) are bare squares: their label is for screen readers, their menu sits
 * on the tile (shown on hover or focus where there's a pointer), and the add
 * tile has no hint; `labelId` names an element that already labels them.
 * `tile` shapes a side's tile (stages).
 */
function PhotoSlot({
  label,
  labelId,
  url,
  busy,
  small = false,
  tile = "aspect-square",
  onFile,
  onView,
  onRemove,
}: {
  label: string;
  labelId?: string;
  url: string | null | undefined;
  busy: boolean;
  small?: boolean;
  tile?: string;
  onFile?: (file: File) => void;
  onView?: () => void;
  onRemove?: () => void;
}) {
  const t = useI18n();
  const id = useId();
  const { pick, dropping, dropTarget, fileInput } = usePhotoFile(onFile, busy);
  const labelledBy = labelId ?? `${id}-label`;
  const tileFocus =
    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const menu = url && (
    // Not modal, so the confirmation it opens gets focus cleanly.
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={busy}
              aria-labelledby={`${labelledBy} ${id}-actions`}
              className={cn(
                small &&
                  "absolute right-1 top-1 bg-popover/90 text-popover-foreground shadow-sm hover:bg-popover aria-expanded:opacity-100 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 [@media(hover:hover)]:opacity-0",
              )}
            >
              <MoreHorizontal strokeWidth={1.75} aria-hidden="true" />
              <span id={`${id}-actions`} className="sr-only">
                {t("photos.actions")}
              </span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("photos.actions")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {onFile && (
          <DropdownMenuItem onSelect={pick}>
            <ImageUp strokeWidth={1.75} aria-hidden="true" />
            {t("photos.replace")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={onRemove}
          className="text-destructive focus:text-destructive [&_svg]:text-destructive"
        >
          <Trash2 strokeWidth={1.75} aria-hidden="true" />
          {t("photos.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div
        aria-busy={busy}
        {...dropTarget}
        className={cn(
          "group/tile relative overflow-hidden",
          small ? "aspect-square rounded-lg" : cn(tile, "rounded-xl"),
          url === null ? "border border-dashed" : "bg-card",
          url === undefined && "animate-pulse",
          dropping && "ring-2 ring-ring",
        )}
      >
        {url ? (
          <button
            type="button"
            onClick={onView}
            aria-labelledby={`${labelledBy} ${id}-view`}
            className={cn("group/photo size-full cursor-zoom-in", tileFocus)}
          >
            <img
              src={url}
              alt=""
              decoding="async"
              loading={small ? "lazy" : undefined}
              className={cn(
                "size-full object-contain",
                small ? "p-1" : "p-2 sm:p-3",
              )}
            />
            {!small && (
              <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-popover/90 text-popover-foreground opacity-0 shadow-sm transition-opacity duration-100 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100 motion-reduce:transition-none">
                <Maximize2
                  className="size-3.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
            )}
            <span id={`${id}-view`} className="sr-only">
              {t("photos.view")}
            </span>
          </button>
        ) : (
          url === null &&
          onFile && (
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              aria-labelledby={`${labelledBy} ${id}-add`}
              className={cn(
                "flex size-full flex-col items-center justify-center gap-1 p-3 text-center text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground",
                tileFocus,
              )}
            >
              <ImagePlus
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span
                id={`${id}-add`}
                className={cn("text-ui font-medium", small && "sr-only")}
              >
                {t("photos.add")}
              </span>
              {!small && <span className="text-xs">{t("photos.formats")}</span>}
            </button>
          )
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              strokeWidth={1.75}
              role="img"
              aria-label={t("photos.uploading")}
            />
          </div>
        )}
        {small && url && (
          <>
            <span id={`${id}-label`} className="sr-only">
              {label}
            </span>
            {menu}
          </>
        )}
      </div>
      {!small && (
        <div className="flex h-7 items-center justify-between gap-2">
          <span
            id={`${id}-label`}
            className="truncate text-ui text-muted-foreground"
          >
            {label}
          </span>
          {menu}
        </div>
      )}
      {fileInput}
    </div>
  );
}
