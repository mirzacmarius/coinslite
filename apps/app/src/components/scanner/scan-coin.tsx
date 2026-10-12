"use client";

import { useAddItem } from "@/components/items/add-item";
import {
  ShrinkError,
  type ShrinkTarget,
  photoThumbnail,
  shrinkImage,
} from "@/lib/shrink-image";
import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type PhotoSide,
  photoErrors,
  photoSides,
  uploadErrors,
} from "@coinslite/backend/convex/photos/rules";
import {
  scannerErrors,
  scannerLimits,
} from "@coinslite/backend/convex/scanner/rules";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { IconButton } from "@coinslite/ui/icon-button";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { SidebarMenuButton, SidebarMenuItem } from "@coinslite/ui/sidebar";
import { cn } from "@coinslite/ui/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  Camera,
  ChevronRight,
  ImagePlus,
  Library,
  Loader2,
  ScanLine,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ScanPreset, ScannedPhoto } from "./scan-preset";

/**
 * A photo made small enough to scan: a JPEG whose longest side is at most
 * `scannerLimits.photoPixels`, at the best quality that fits the vision
 * model. Phone cameras take far larger photos than a coin needs. It also
 * becomes the Item's photo.
 */
const scanPhoto: ShrinkTarget = {
  longest: scannerLimits.photoPixels,
  types: ["image/jpeg"],
  qualities: [0.9, 0.8, 0.7, 0.6],
  maxBytes: scannerLimits.photoBytes,
};

/**
 * The coin scanner (spec §16): photograph a coin's front, then its back, and
 * CoinsLite suggests what it is. The suggestion opens in the "New Item" form
 * for the person to review, with the photos; a coin that isn't identified
 * can be added by hand, photos and all.
 */

const ScanCoinContext = createContext<() => void>(() => {});

/** Opens the scanner. Only offer it where `useScanner().available` says so. */
export const useScanCoin = () => useContext(ScanCoinContext);

/**
 * Whether the signed-in person may scan (the scanner flag, and Premium
 * during the beta), and whether this deployment can. Undefined while loading.
 */
export function useScanner() {
  const status = useQuery(api.scanner.status);
  // The app shell asks too; see useHydrated.
  return useHydrated() ? status : undefined;
}

/** Holds the one scanner dialog, beside the "New Item" form it hands over to. */
export function ScanCoinProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // A fresh dialog for each scan, so nothing of the last one lingers.
  const [scan, setScan] = useState(0);
  const openScanner = useCallback(() => {
    setScan((count) => count + 1);
    setOpen(true);
  }, []);
  return (
    <ScanCoinContext.Provider value={openScanner}>
      {children}
      <ScanCoinDialog key={scan} open={open} onOpenChange={setOpen} />
    </ScanCoinContext.Provider>
  );
}

/** The sidebar's quick action, for those who may scan. */
export function ScanCoinQuickAction() {
  const t = useI18n();
  const scanner = useScanner();
  const scanCoin = useScanCoin();
  if (!scanner?.available) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={t("scanner.scan")} onClick={scanCoin}>
        <ScanLine aria-hidden="true" />
        {/* The badge comes last, so the button's own truncation misses it. */}
        <span className="truncate">{t("scanner.scan")}</span>
        <Badge className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden">
          {t("scanner.beta")}
        </Badge>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** The page toolbar's button, for those who may scan. */
export function ScanCoinButton() {
  const t = useI18n();
  const scanner = useScanner();
  const scanCoin = useScanCoin();
  if (!scanner?.available) return null;
  return (
    <Button variant="ghost" size="xs" onClick={scanCoin}>
      <ScanLine aria-hidden="true" />
      {t("scanner.scan")}
    </Button>
  );
}

/**
 * A side's photo, shrunk for scanning, with the thumbnail lists will show of
 * it, and their uploads once there are some.
 */
type TakenPhoto = {
  blob: Blob;
  thumbnail: Blob;
  url: string;
  uploaded?: { storageId: Id<"_storage">; thumbnailId: Id<"_storage"> };
};

type Status =
  | { state: "idle" }
  | { state: "working" }
  | { state: "unidentified" }
  | { state: "notConfigured" }
  | { state: "failed"; message: string };

const codeOf = (failure: unknown) =>
  failure instanceof ConvexError
    ? String(failure.data)
    : failure instanceof ShrinkError
      ? failure.reason === "tooLarge"
        ? photoErrors.tooLarge
        : photoErrors.notAnImage
      : "";

/**
 * Uploads a scan photo and its thumbnail and registers them to the person,
 * so only they can use them.
 */
function useScanUpload() {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const register = useMutation(api.photos.register);
  const store = async (blob: Blob) => {
    const response = await fetch(await generateUploadUrl(), {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    await register({ storageId });
    return storageId;
  };
  return async ({ blob, thumbnail }: TakenPhoto) => {
    const [storageId, thumbnailId] = await Promise.all([
      store(blob),
      store(thumbnail),
    ]);
    return { storageId, thumbnailId };
  };
}

/**
 * The scanner: one step per side, front first, each taken with the camera
 * on a phone or picked from the computer's files, then "Identify coin".
 */
function ScanCoinDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const mod = useModifierKey();
  const scanner = useScanner();
  const addItem = useAddItem();
  const upload = useScanUpload();
  const identify = useAction(api.scan.identify);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSide, TakenPhoto>>>(
    {},
  );
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const working = status.state === "working";
  const configured = scanner?.configured !== false;
  const nextSide = photoSides.find((side) => !photos[side]);

  const errorMessage = (code: string) =>
    code === photoErrors.tooLarge
      ? t("scanner.errors.tooLarge")
      : code === photoErrors.notAnImage
        ? t("scanner.errors.notAnImage")
        : code === uploadErrors.tooMany
          ? t("scanner.errors.uploadsTooMany")
          : code === scannerErrors.tooMany
            ? t("scanner.errors.tooMany")
            : code === scannerErrors.notAvailable
              ? t("scanner.errors.notAvailable")
              : t("scanner.errors.failed");

  const take = async (side: PhotoSide, file: File) => {
    try {
      const { photo, thumbnail } = await shrinkImage(file, {
        photo: scanPhoto,
        thumbnail: photoThumbnail,
      });
      setPhotos((taken) => ({
        ...taken,
        [side]: {
          blob: photo.blob,
          thumbnail: thumbnail.blob,
          url: URL.createObjectURL(photo.blob),
        },
      }));
      setStatus({ state: "idle" });
    } catch (failure) {
      setStatus({ state: "failed", message: errorMessage(codeOf(failure)) });
    }
  };

  /** Uploads the photos (with their thumbnails) not uploaded yet; returns them all as uploaded. */
  const uploaded = async () => {
    const done: ScanPreset["photos"] = {};
    for (const side of photoSides) {
      const photo = photos[side];
      if (!photo) continue;
      const files = photo.uploaded ?? (await upload(photo));
      if (!photo.uploaded)
        setPhotos((taken) => ({
          ...taken,
          [side]: { ...photo, uploaded: files },
        }));
      done[side] = { ...files, url: photo.url } satisfies ScannedPhoto;
    }
    return done;
  };

  const handOver = (preset: ScanPreset) => {
    onOpenChange(false);
    addItem({ type: "coin", scan: preset });
  };

  const scan = async () => {
    if (working || nextSide || !configured) return;
    setStatus({ state: "working" });
    try {
      const sent = await uploaded();
      if (!sent.front || !sent.back) {
        setStatus({ state: "idle" });
        return;
      }
      const result = await identify({
        front: sent.front.storageId,
        back: sent.back.storageId,
      });
      if (result.outcome === "suggested")
        handOver({ photos: sent, suggestion: result });
      else setStatus({ state: result.outcome });
    } catch (failure) {
      setStatus({ state: "failed", message: errorMessage(codeOf(failure)) });
    }
  };

  /** The add form without suggestions, with whichever photos were taken. */
  const addByHand = async () => {
    if (working) return;
    setStatus({ state: "working" });
    try {
      handOver({ photos: await uploaded() });
    } catch {
      // The photos can be added on the Item's page later.
      handOver({ photos: {} });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void scan();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Library className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{t("nav.collection")}</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <DialogTitle className="text-foreground">
              {t("scanner.title")}
            </DialogTitle>
            <Badge className="ml-1">{t("scanner.beta")}</Badge>
          </div>
          <DialogClose asChild>
            <IconButton type="button" label={t("scanner.close")} shortcut="Esc">
              <X />
            </IconButton>
          </DialogClose>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
          <DialogDescription>
            {configured ? t("scanner.description") : t("scanner.notConfigured")}
          </DialogDescription>
          {configured && (
            <p className="text-xs text-muted-foreground">{t("scanner.tips")}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {photoSides.map((side, step) => (
              <PhotoStep
                key={side}
                side={side}
                step={step + 1}
                photo={photos[side]}
                current={side === nextSide}
                disabled={working}
                onFile={(file) => void take(side, file)}
              />
            ))}
          </div>
          <p
            aria-live="polite"
            className={cn(
              "flex min-h-5 items-center gap-1.5 text-[13px]",
              status.state === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {status.state === "working" ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {t("scanner.identifying")}
              </>
            ) : status.state === "unidentified" ? (
              t("scanner.unidentified")
            ) : status.state === "notConfigured" ? (
              t("scanner.notConfigured")
            ) : status.state === "failed" ? (
              status.message
            ) : configured ? (
              t(`scanner.next.${nextSide ?? "done"}`)
            ) : null}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={working}
            onClick={() => void addByHand()}
          >
            {t("scanner.addByHand")}
          </Button>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("scanner.cancel")}
              </Button>
            </DialogClose>
            {configured && (
              <Button
                type="button"
                disabled={working || nextSide !== undefined}
                onClick={() => void scan()}
              >
                {working && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t("scanner.identify")}
                {mod && (
                  <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                    {mod}↵
                  </Kbd>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Whether this device takes photos with a camera at hand (a phone or tablet). */
function useTouchCamera() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return touch;
}

/**
 * One side's step: its photo, or what to photograph. Phones open the camera
 * (or their photo library); computers pick a file or take one dropped.
 */
function PhotoStep({
  side,
  step,
  photo,
  current,
  disabled,
  onFile,
}: {
  side: PhotoSide;
  step: number;
  photo: TakenPhoto | undefined;
  current: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const t = useI18n();
  const id = useId();
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const touch = useTouchCamera();
  const [dropping, setDropping] = useState(false);
  const pick = (input: typeof camera) => input.current?.click();
  const sideName = t(
    `photos.sides.${side === "front" ? "obverse" : "reverse"}`,
  );
  const fileInput = (ref: typeof camera, capture?: "environment") => (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      capture={capture}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onFile(file);
      }}
    />
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <h3
        id={`${id}-title`}
        className={cn(
          "flex items-center gap-1.5 text-[13px] font-medium",
          !current && !photo && "text-muted-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 items-center justify-center rounded-full border text-xs",
            current && "border-foreground",
          )}
        >
          {step}
        </span>
        {t(`scanner.steps.${side}`)}
        <span className="truncate font-normal text-muted-foreground">
          {sideName}
        </span>
      </h3>
      <button
        type="button"
        disabled={disabled}
        onClick={() => pick(touch ? camera : files)}
        onDragOver={(event) => {
          if (disabled || !event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropping(false);
          const file = event.dataTransfer.files[0];
          if (file && !disabled) onFile(file);
        }}
        aria-label={`${t(photo ? "scanner.retake" : "scanner.takePhoto")}: ${sideName}`}
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground outline-none transition-colors duration-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
          !photo && "border-dashed",
          current && !photo && "border-foreground/40",
          dropping && "ring-2 ring-ring",
        )}
      >
        {photo ? (
          <img src={photo.url} alt="" className="size-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 p-3 text-center">
            {touch ? (
              <Camera
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <ImagePlus
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
            <span className="text-[13px] font-medium">
              {t(touch ? "scanner.takePhoto" : "scanner.choosePhoto")}
            </span>
          </span>
        )}
      </button>
      <div className="flex h-7 items-center gap-1">
        {photo && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={() => pick(touch ? camera : files)}
          >
            {t("scanner.retake")}
          </Button>
        )}
        {touch && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={() => pick(files)}
          >
            {t("scanner.chooseFile")}
          </Button>
        )}
      </div>
      {fileInput(camera, "environment")}
      {fileInput(files)}
    </section>
  );
}
