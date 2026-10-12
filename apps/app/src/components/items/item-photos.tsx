"use client";

import { ShrinkError, photoThumbnail, shrinkImage } from "@/lib/shrink-image";
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
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type * as React from "react";
import { useId, useRef, useState } from "react";

const accept = "image/jpeg,image/png,image/webp,image/gif";

/** Coins call their sides obverse and reverse; a stamp has the stamp and its back. */
const sideNames = {
  coin: { front: "obverse", back: "reverse" },
  banknote: { front: "front", back: "back" },
  stamp: { front: "stamp", back: "back" },
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
 * Uploads a photo file to storage, along with the thumbnail the browser makes
 * of it for lists, then has the server check both and put them on the Item:
 * on `side`, or as one more photo when no side is given. The photo itself
 * uploads as it is.
 */
function usePhotoUpload(itemId: Id<"items">) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const register = useMutation(api.photos.register);
  const attach = useAction(api.photos.attach);
  const store = async (body: Blob, type: string) => {
    const response = await fetch(await generateUploadUrl(), {
      method: "POST",
      headers: { "Content-Type": type },
      body,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    // At once, so the upload is ours before anything else can use it.
    await register({ storageId });
    return storageId;
  };
  return async (side: PhotoSide | undefined, file: File) => {
    const type = await checkFile(file);
    const { thumbnail } = await shrinkImage(file, {
      thumbnail: photoThumbnail,
    });
    const [storageId, thumbnailId] = await Promise.all([
      store(file, type),
      store(thumbnail.blob, thumbnail.blob.type),
    ]);
    await attach({ itemId, side, storageId, thumbnailId });
  };
}

/**
 * An Item's photos: its two sides, then up to `photoLimits.more` more. Each
 * can be added, replaced (sides) or removed, and viewed full screen.
 */
export function ItemPhotos({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const photos = useQuery(api.photos.ofItem, { itemId: item._id });
  const upload = usePhotoUpload(item._id);
  const removePhoto = useMutation(api.photos.remove);
  const moreId = useId();
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
  const more = photos?.more ?? [];
  const urlOf = (side: PhotoSide) =>
    photos === undefined ? undefined : photos?.[side] ?? null;
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
      const code =
        failure instanceof ConvexError
          ? String(failure.data)
          : // The browser couldn't read the picture to make its thumbnail.
            failure instanceof ShrinkError && failure.reason === "unreadable"
            ? photoErrors.notAnImage
            : "";
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
  const removalTitle = isPhotoSide(removal.target)
    ? t(`photos.removeTitles.${names[removal.target]}`)
    : t("photos.more.removeTitle");

  return (
    <section
      aria-label={t("photos.title")}
      className="flex max-w-sm flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {photoSides.map((side) => (
          <PhotoSlot
            key={side}
            label={t(`photos.sides.${names[side]}`)}
            url={urlOf(side)}
            busy={busy[side]}
            onFile={(file) => void add(side, file)}
            onView={() => view(side)}
            onRemove={() => setRemoval({ open: true, target: side })}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 id={moreId} className="text-xs font-medium text-muted-foreground">
            {t("photos.more.title")}
          </h3>
          {photos !== undefined && more.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t("photos.more.hint", { limit: photoLimits.more })}
            </p>
          )}
        </div>
        {photos !== undefined && (
          <div className="grid grid-cols-3 gap-2">
            {more.map((photo, at) => (
              <PhotoSlot
                key={photo.id}
                small
                label={moreLabel(at + 1)}
                url={photo.url}
                busy={false}
                onView={() => view(photo.id)}
                onRemove={() => setRemoval({ open: true, target: photo.id })}
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
 * One photo slot: the photo (click to view, menu to replace or remove), or a
 * tile to add one. A file can also be dropped on the tile. `url` is undefined
 * while loading. Without `onFile` the photo can only be viewed or removed;
 * without `onView` and `onRemove` the slot only adds. `small` tiles (the more
 * photos) show the add tile without its hint, and `labelId` names an element
 * that already labels them.
 */
function PhotoSlot({
  label,
  labelId,
  url,
  busy,
  small = false,
  onFile,
  onView,
  onRemove,
}: {
  label: string;
  labelId?: string;
  url: string | null | undefined;
  busy: boolean;
  small?: boolean;
  onFile?: (file: File) => void;
  onView?: () => void;
  onRemove?: () => void;
}) {
  const t = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const pick = () => input.current?.click();
  const labelledBy = labelId ?? `${id}-label`;
  const tileFocus =
    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const onDragOver = (event: React.DragEvent) => {
    if (!onFile || busy || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDropping(true);
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDropping(false);
    const file = event.dataTransfer.files[0];
    if (file && onFile && !busy) onFile(file);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div
        aria-busy={busy}
        onDragOver={onDragOver}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
        className={cn(
          "relative aspect-square overflow-hidden rounded-lg border bg-muted",
          url === null && "border-dashed",
          url === undefined && "animate-pulse",
          dropping && "ring-2 ring-ring",
        )}
      >
        {url ? (
          <button
            type="button"
            onClick={onView}
            aria-labelledby={`${labelledBy} ${id}-view`}
            className={cn("size-full", tileFocus)}
          >
            <img src={url} alt="" className="size-full object-contain" />
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
                "flex size-full flex-col items-center justify-center gap-1 p-3 text-center text-muted-foreground transition-colors duration-100 hover:bg-muted/60 hover:text-foreground",
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
                className={cn("text-[13px] font-medium", small && "sr-only")}
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
      </div>
      {!(small && url === null) && (
        <div className="flex h-7 items-center justify-between gap-2">
          <span
            id={`${id}-label`}
            className="truncate text-xs text-muted-foreground"
          >
            {label}
          </span>
          {url && (
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
          )}
        </div>
      )}
      {onFile && (
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
      )}
    </div>
  );
}
