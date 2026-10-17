"use client";

import { FormDialog } from "@/components/form-dialog";
import type { CommonsFile } from "@/lib/commons-image";
import { formChanged } from "@/lib/discard-changes";
import { errorText } from "@/lib/form-errors";
import {
  ShrinkError,
  type ShrinkTarget,
  type ShrunkImage,
  shrinkImage,
} from "@/lib/shrink-image";
import { submitForm } from "@/lib/submit-form";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { catalogLimits } from "@coinslite/backend/convex/catalog/fields";
import type { Provenance } from "@coinslite/backend/convex/catalog/fields";
import {
  type CatalogImageError,
  type ImageBounds,
  type ImageCredit,
  catalogImageErrors,
  catalogImageLimits,
  commonLicences,
  fullImageBounds,
  isWebAddress,
  withinBounds,
} from "@coinslite/backend/convex/catalog/imageRules";
import { uploadErrors } from "@coinslite/backend/convex/photos/rules";
import { Button } from "@coinslite/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { Field } from "@coinslite/ui/field";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useForm, useSelector } from "@tanstack/react-form";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { ChevronRight, ImageIcon, ImagePlus, Loader2, X } from "lucide-react";
import type * as React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { CatalogImageCommons } from "./catalog-image-commons";

/** A picture an admin chose, converted to WebP at full size and as a thumbnail. */
type PickedImage = { full: ShrunkImage; thumbnail: ShrunkImage };

/**
 * The sizes a Catalog image is stored at, both WebP (the server accepts
 * nothing else), so the original never uploads: the full size within the
 * bounds its licence allows (imageRules.ts `fullImageBounds`).
 */
const catalogImageSizes = (full: ImageBounds) =>
  ({
    full: { ...full, types: ["image/webp"], qualities: [0.85] },
    thumbnail: {
      longest: catalogImageLimits.thumbnail,
      types: ["image/webp"],
      qualities: [0.85],
    },
  }) satisfies Record<keyof PickedImage, ShrinkTarget>;

/** The Catalog entry whose image is edited, as it is now. */
export type CatalogImageEntry = {
  key: string;
  title: string;
  imageUrl?: string;
  imageProvenance?: Provenance;
  /** A banknote's real size, in millimetres, which some licences limit its image by. */
  width?: number;
  height?: number;
};

const accept = "image/jpeg,image/png,image/webp,image/gif";

/** The credit's fields, each with its placeholder. */
const fields = [
  ["source", "sourcePlaceholder"],
  ["author", "authorPlaceholder"],
  ["licence", "licencePlaceholder"],
  ["link", "linkPlaceholder"],
] as const;

/** The codes an image function can fail with, each with its message. */
const failureCodes = new Set<string>([
  ...Object.values(catalogImageErrors),
  uploadErrors.tooMany,
  "NOT_ADMIN",
]);
type FailureCode =
  | CatalogImageError
  | (typeof uploadErrors)["tooMany"]
  | "NOT_ADMIN";
const failureCode = (failure: unknown) => {
  const code = failure instanceof ConvexError ? String(failure.data) : "";
  return failureCodes.has(code) ? (code as FailureCode) : undefined;
};

/** Sends one file to storage through a one-time upload address. */
function useStoreFile() {
  const generateUploadUrl = useMutation(api.catalog.images.generateUploadUrl);
  const register = useMutation(api.catalog.images.register);
  return async (file: Blob) => {
    const response = await fetch(await generateUploadUrl(), {
      method: "POST",
      headers: { "Content-Type": "image/webp" },
      body: file,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    // At once, so the upload is the admin's before anything else can use it.
    await register({ storageId });
    return storageId;
  };
}

/**
 * A Catalog entry's image and its credit, for admins: choose a picture (the
 * browser converts it to WebP at full size and as a thumbnail), or keep the
 * current one, and credit its source, author, licence and link. Mount it
 * with a fresh `key` each time it opens, so it starts from the entry.
 */
export function CatalogImageDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CatalogImageEntry;
}) {
  const t = useI18n();
  const mod = useModifierKey();
  const baseId = useId();
  const storeFile = useStoreFile();
  const attach = useAction(api.catalog.images.attach);
  const updateCredit = useMutation(api.catalog.images.updateCredit);
  const [picked, setPicked] = useState<PickedImage>();
  const [converting, setConverting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [commonsFile, setCommonsFile] = useState<CommonsFile>();
  const busy = converting || fetching;
  const [imageError, setImageError] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const [defaults] = useState<ImageCredit>(() => ({
    source: entry.imageProvenance?.source ?? "",
    author: entry.imageProvenance?.author ?? "",
    licence: entry.imageProvenance?.licence ?? "",
    link: entry.imageProvenance?.link ?? "",
  }));
  /** The chosen picture as it was, to convert again if the licence allows less. */
  const [original, setOriginal] = useState<Blob>();
  const hasImage = entry.imageUrl !== undefined;
  /** How large the full size may be under a licence; null when the entry lacks the size it needs. */
  const boundsFor = (licence: string) =>
    fullImageBounds({ width: entry.width, height: entry.height }, licence);
  const failureMessage = (failure: unknown, fallback: string) => {
    const code = failureCode(failure);
    return code ? t(`catalogImages.errors.${code}`) : fallback;
  };

  const rules = useMemo(() => {
    const part = (required: string, max: number) =>
      z
        .string()
        .trim()
        .min(1, required)
        .max(max, t("catalogImages.errors.tooLong", { max }))
        .refine(
          (value) => !/numista/i.test(value),
          t("catalogImages.errors.numista"),
        );
    return {
      source: part(
        t("catalogImages.errors.sourceRequired"),
        catalogLimits.provenance,
      ),
      author: part(
        t("catalogImages.errors.authorRequired"),
        catalogLimits.provenance,
      ),
      licence: part(
        t("catalogImages.errors.licenceRequired"),
        catalogLimits.provenance,
      ),
      link: part(
        t("catalogImages.errors.linkRequired"),
        catalogLimits.url,
      ).refine(
        (value) => !value.trim() || isWebAddress(value.trim()),
        t("catalogImages.errors.invalidLink"),
      ),
    };
  }, [t]);

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      if (!picked && !hasImage) return;
      const bounds = boundsFor(value.licence);
      if (!bounds) {
        setFailed(t("catalogImages.errors.REPRODUCTION_SIZE_REQUIRED"));
        return;
      }
      try {
        if (picked && original) {
          // The licence may allow less than when the picture was chosen.
          const image = withinBounds(picked.full, bounds)
            ? picked
            : await shrinkImage(original, catalogImageSizes(bounds));
          const [full, thumbnail] = await Promise.all([
            storeFile(image.full.blob),
            storeFile(image.thumbnail.blob),
          ]);
          await attach({ key: entry.key, full, thumbnail, credit: value });
        } else {
          await updateCredit({ key: entry.key, credit: value });
        }
      } catch (failure) {
        setFailed(failureMessage(failure, t("catalogImages.errors.failed")));
        return;
      }
      toast.success(
        t(picked ? "catalogImages.saved" : "catalogImages.creditSaved"),
      );
      onOpenChange(false);
    },
  });
  const submitted = useSelector(
    form.store,
    (state) => state.submissionAttempts > 0,
  );
  const submitting = useSelector(form.store, (state) => state.isSubmitting);
  const changed = useSelector(form.store, (state) =>
    formChanged(state, defaults),
  );
  const errorOf = (errors: unknown[]) =>
    submitted ? errorText(errors) : undefined;

  const submit = (from: Element) => {
    if (busy) return;
    if (!picked && !hasImage)
      setImageError(t("catalogImages.errors.imageRequired"));
    void submitForm(form, t("common.saveFailed"), from);
  };

  /** Converts a picture to the sizes stored; whether it could be. */
  const convertPicture = async (file: Blob) => {
    setImageError(undefined);
    if (file.size > catalogImageLimits.originalBytes) {
      setImageError(t("catalogImages.errors.ORIGINAL_TOO_LARGE"));
      return false;
    }
    setConverting(true);
    try {
      const full = catalogImageLimits.full;
      const bounds = boundsFor(form.getFieldValue("licence")) ?? {
        longest: full,
        shortest: full,
      };
      setPicked(await shrinkImage(file, catalogImageSizes(bounds)));
      setOriginal(file);
      return true;
    } catch (failure) {
      const unwritable =
        failure instanceof ShrinkError && failure.reason === "unwritable";
      setImageError(
        unwritable
          ? t("catalogImages.errors.WEBP_UNSUPPORTED")
          : t("catalogImages.errors.IMAGE_UNREADABLE"),
      );
      return false;
    } finally {
      setConverting(false);
    }
  };

  /** Takes a Commons file's picture, and its credit in place of the one shown. */
  const chooseFromCommons = async (file: CommonsFile, picture: Blob) => {
    if (!(await convertPicture(picture))) return;
    setCommonsFile(file);
    for (const [name] of fields) form.setFieldValue(name, file.credit[name]);
  };

  /**
   * Takes a picture the admin chose. A credit filled in from Commons and
   * left as it was goes back to the entry's, as it doesn't fit another
   * picture.
   */
  const chooseFile = async (file: File) => {
    if (!(await convertPicture(file)) || !commonsFile) return;
    const values = form.state.values;
    if (fields.every(([name]) => values[name] === commonsFile.credit[name]))
      for (const [name] of fields) form.setFieldValue(name, defaults[name]);
    setCommonsFile(undefined);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={submitting ? undefined : onOpenChange}
      changed={changed || picked !== undefined}
    >
      <DialogContent
        className="sm:max-w-[37.5rem]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            submit(event.currentTarget);
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex min-w-0 items-center gap-1 text-ui text-muted-foreground">
              <ImageIcon
                className="size-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="truncate">{entry.title}</span>
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {t("catalogImages.title")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton
                type="button"
                label={t("catalogImages.close")}
                shortcut="Esc"
              >
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="sr-only">
            {t("catalogImages.description")}
          </DialogDescription>

          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-3 pt-1">
            <ImagePicker
              currentUrl={entry.imageUrl}
              picked={picked}
              converting={converting}
              disabled={fetching}
              error={imageError}
              onFile={(file) => void chooseFile(file)}
            />
            <CatalogImageCommons
              disabled={converting || submitting}
              filledFrom={commonsFile}
              onBusyChange={setFetching}
              onPicture={chooseFromCommons}
            />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-xs font-medium">
                {t("catalogImages.credit")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {t("catalogImages.creditHint")}
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {fields.map(([name, placeholder]) => (
                  <form.Field
                    key={name}
                    name={name}
                    validators={{ onChange: rules[name] }}
                  >
                    {(field) => (
                      <Field
                        id={`${baseId}-${name}`}
                        label={t(`catalogImages.${name}`)}
                        error={errorOf(field.state.meta.errors)}
                      >
                        {(control) => (
                          <Input
                            {...control}
                            type={name === "link" ? "url" : "text"}
                            inputMode={name === "link" ? "url" : undefined}
                            list={
                              name === "licence"
                                ? `${baseId}-licences`
                                : undefined
                            }
                            placeholder={t(`catalogImages.${placeholder}`)}
                            maxLength={
                              name === "link"
                                ? catalogLimits.url
                                : catalogLimits.provenance
                            }
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            onBlur={field.handleBlur}
                          />
                        )}
                      </Field>
                    )}
                  </form.Field>
                ))}
              </div>
              <datalist id={`${baseId}-licences`}>
                {commonLicences.map((licence) => (
                  <option key={licence} value={licence} />
                ))}
              </datalist>
            </fieldset>
            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {failed}
              </p>
            )}
          </div>

          <DialogFooter>
            <span />
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={submitting}>
                  {t("catalogImages.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting || busy}>
                {submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t("catalogImages.save")}
                {mod && (
                  <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                    {mod}↵
                  </Kbd>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </FormDialog>
  );
}

/**
 * The picture well: the new picture once converted, else the current image,
 * else a tile to choose one. A file can also be dropped on it.
 */
function ImagePicker({
  currentUrl,
  picked,
  converting,
  disabled = false,
  error,
  onFile,
}: {
  currentUrl?: string;
  picked?: PickedImage;
  converting: boolean;
  /** While a picture comes from elsewhere (Wikimedia Commons). */
  disabled?: boolean;
  error?: string;
  onFile: (file: File) => void;
}) {
  const t = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const previewUrl = usePreviewUrl(picked?.full.blob);
  const shown = previewUrl ?? currentUrl;
  const busy = converting || disabled;
  const pick = () => input.current?.click();
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
  const size = (value: { width: number; height: number }) =>
    `${value.width} × ${value.height}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a drop target only; the button inside is the click and keyboard control */}
      <div
        aria-busy={converting}
        onDragOver={onDragOver}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
        className={cn(
          "relative size-32 shrink-0 overflow-hidden rounded-lg border bg-muted",
          !shown && "border-dashed",
          dropping && "ring-2 ring-ring",
        )}
      >
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label={
            shown ? t("catalogImages.chooseAnother") : t("catalogImages.choose")
          }
          aria-describedby={`${id}-status`}
          className="flex size-full items-center justify-center text-muted-foreground outline-none transition-colors duration-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {shown ? (
            <img
              src={shown}
              alt=""
              referrerPolicy="no-referrer"
              className="size-full object-contain"
            />
          ) : (
            <ImagePlus
              className="size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </button>
        {converting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <p id={`${id}-status`} className="text-ui" aria-live="polite">
          {converting
            ? t("catalogImages.converting")
            : picked
              ? t("catalogImages.converted", {
                  full: size(picked.full),
                  thumbnail: size(picked.thumbnail),
                })
              : currentUrl
                ? t("catalogImages.current")
                : t("catalogImages.formats")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("catalogImages.sizes")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={pick}
          disabled={busy}
        >
          {shown ? t("catalogImages.chooseAnother") : t("catalogImages.choose")}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
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

/** An object URL showing a file, released when the file changes or the view goes. */
function usePreviewUrl(file: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}
