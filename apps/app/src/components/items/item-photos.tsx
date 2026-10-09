"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type PhotoSide,
  photoErrors,
  photoLimits,
  photoSides,
  photoSignatureLength,
  photoType,
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

/** Coins call their sides obverse and reverse. */
const sideNames = {
  coin: { front: "obverse", back: "reverse" },
  banknote: { front: "front", back: "back" },
  stamp: { front: "front", back: "back" },
} as const;

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

/** Uploads a file to storage, then has the server check it and put it on the Item. */
function usePhotoUpload(itemId: Id<"items">) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const attach = useAction(api.photos.attach);
  return async (side: PhotoSide, file: File) => {
    const type = await checkFile(file);
    const response = await fetch(await generateUploadUrl(), {
      method: "POST",
      headers: { "Content-Type": type },
      body: file,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    await attach({ itemId, side, storageId });
  };
}

/** An Item's front and back photos: add, replace, remove, view full screen. */
export function ItemPhotos({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const photos = useQuery(api.photos.ofItem, { itemId: item._id });
  const upload = usePhotoUpload(item._id);
  const removePhoto = useMutation(api.photos.remove);
  const [busy, setBusy] = useState<Record<PhotoSide, boolean>>({
    front: false,
    back: false,
  });
  const [viewing, setViewing] = useState<number | null>(null);
  const [removal, setRemoval] = useState<{ open: boolean; side: PhotoSide }>({
    open: false,
    side: "front",
  });
  const names = sideNames[item.type];
  const urlOf = (side: PhotoSide) =>
    photos === undefined ? undefined : photos?.[side] ?? null;
  const shown = photoSides.flatMap((side) => {
    const src = urlOf(side);
    return src
      ? [{ side, src, caption: t(`photos.sides.${names[side]}`) }]
      : [];
  });

  const add = async (side: PhotoSide, file: File) => {
    setBusy((sides) => ({ ...sides, [side]: true }));
    try {
      await upload(side, file);
    } catch (failure) {
      const code = failure instanceof ConvexError ? String(failure.data) : "";
      toast.error(
        code === photoErrors.tooLarge
          ? t("photos.errors.tooLarge")
          : code === photoErrors.notAnImage
            ? t("photos.errors.notAnImage")
            : t("photos.errors.failed"),
      );
    } finally {
      setBusy((sides) => ({ ...sides, [side]: false }));
    }
  };

  return (
    <section
      aria-label={t("photos.title")}
      className="grid max-w-sm grid-cols-2 gap-3"
    >
      {photoSides.map((side) => (
        <PhotoSlot
          key={side}
          label={t(`photos.sides.${names[side]}`)}
          url={urlOf(side)}
          busy={busy[side]}
          onFile={(file) => void add(side, file)}
          onView={() =>
            setViewing(shown.findIndex((photo) => photo.side === side))
          }
          onRemove={() => setRemoval({ open: true, side })}
        />
      ))}
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
        title={t(`photos.removeTitles.${names[removal.side]}`)}
        description={t("photos.removeBody")}
        confirmLabel={t("photos.remove")}
        cancelLabel={t("photos.cancel")}
        destructive
        onConfirm={async () => {
          try {
            await removePhoto({ itemId: item._id, side: removal.side });
          } catch {
            toast.error(t("photos.errors.removeFailed"));
          }
        }}
      />
    </section>
  );
}

/**
 * One side: the photo (click to view, menu to replace or remove), or a tile
 * to add one. A file can also be dropped on the tile. `url` is undefined
 * while loading.
 */
function PhotoSlot({
  label,
  url,
  busy,
  onFile,
  onView,
  onRemove,
}: {
  label: string;
  url: string | null | undefined;
  busy: boolean;
  onFile: (file: File) => void;
  onView: () => void;
  onRemove: () => void;
}) {
  const t = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const pick = () => input.current?.click();
  const tileFocus =
    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const onDragOver = (event: React.DragEvent) => {
    if (busy || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDropping(true);
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDropping(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) onFile(file);
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
            aria-labelledby={`${id}-label ${id}-view`}
            className={cn("size-full", tileFocus)}
          >
            <img src={url} alt="" className="size-full object-contain" />
            <span id={`${id}-view`} className="sr-only">
              {t("photos.view")}
            </span>
          </button>
        ) : (
          url === null && (
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              aria-labelledby={`${id}-label ${id}-add`}
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
              <span id={`${id}-add`} className="text-[13px] font-medium">
                {t("photos.add")}
              </span>
              <span className="text-xs">{t("photos.formats")}</span>
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
                    aria-labelledby={`${id}-label ${id}-actions`}
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
              <DropdownMenuItem onSelect={pick}>
                <ImageUp strokeWidth={1.75} aria-hidden="true" />
                {t("photos.replace")}
              </DropdownMenuItem>
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
    </div>
  );
}
