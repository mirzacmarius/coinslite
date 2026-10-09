"use client";

import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type AlbumColour,
  albumColours,
  albumLimits,
} from "@coinslite/backend/convex/albums/rules";
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
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation } from "convex/react";
import { Check, ChevronRight, FolderOpen, Loader2, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { albumColourValues } from "./album-colours";
import { useAlbumError } from "./use-albums";

const nameInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const descriptionInput =
  "w-full resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

type AlbumFormValues = {
  name: string;
  description: string;
  colour: AlbumColour;
};

/**
 * "New Album" in a compact dialog, or "Edit Album" when given an `album`:
 * a name, an optional description and a colour from the palette.
 */
export function AlbumFormDialog({
  open,
  onOpenChange,
  album,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Album being edited; without one the dialog creates a new Album. */
  album?: Doc<"albums">;
  onCreated?: (albumId: Id<"albums">) => void;
}) {
  const t = useI18n();
  const mod = useModifierKey();
  const baseId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const createAlbum = useMutation(api.albums.create);
  const updateAlbum = useMutation(api.albums.update);
  const albumError = useAlbumError();
  const [failed, setFailed] = useState<string>();
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState<AlbumFormValues>(() => ({
    name: album?.name ?? "",
    description: album?.description ?? "",
    colour: album?.colour ?? "blue",
  }));

  const rules = useMemo(
    () => ({
      name: z
        .string()
        .trim()
        .min(1, t("albums.errors.nameRequired"))
        .max(
          albumLimits.name,
          t("albums.errors.nameTooLong", { max: albumLimits.name }),
        ),
      description: z
        .string()
        .trim()
        .max(
          albumLimits.description,
          t("albums.errors.descriptionTooLong", {
            max: albumLimits.description,
          }),
        ),
    }),
    [t],
  );

  const form = useForm({
    defaultValues: defaults,
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      try {
        if (album) {
          await updateAlbum({ albumId: album._id, ...value });
        } else {
          const albumId = await createAlbum(value);
          onCreated?.(albumId);
        }
      } catch (failure) {
        setFailed(
          albumError(
            failure,
            t(
              album ? "albums.errors.saveFailed" : "albums.errors.createFailed",
            ),
          ),
        );
        return;
      }
      toast.success(t(album ? "albums.saved" : "albums.created"));
      form.reset();
      onOpenChange(false);
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const isDirty = form.useStore((state) => state.isDirty);
  useUnsavedInput(open && isDirty);
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submitForm(form);
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm(form);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <FolderOpen
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{t("nav.albums")}</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {album ? t("albums.editAlbum") : t("albums.new")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("albums.close")}
              >
                <X />
              </Button>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="sr-only">
            {t("albums.emptyDescription")}
          </DialogDescription>

          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-3 pt-1">
            <form.Field name="name" validators={{ onChange: rules.name }}>
              {(field) => {
                const error = errorOf(field.state.meta.errors);
                return (
                  <div className="flex flex-col gap-1">
                    <input
                      ref={nameRef}
                      aria-label={t("albums.name")}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        error ? `${baseId}-name-error` : undefined
                      }
                      placeholder={t("albums.namePlaceholder")}
                      className={nameInput}
                      maxLength={albumLimits.name}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                    />
                    {error && (
                      <p
                        id={`${baseId}-name-error`}
                        className="text-xs text-destructive"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>
            <form.Field
              name="description"
              validators={{ onChange: rules.description }}
            >
              {(field) => {
                const error = errorOf(field.state.meta.errors);
                return (
                  <div className="flex flex-col gap-1">
                    <textarea
                      aria-label={t("albums.description")}
                      aria-invalid={error ? true : undefined}
                      rows={2}
                      placeholder={t("albums.descriptionPlaceholder")}
                      className={descriptionInput}
                      maxLength={albumLimits.description}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                    />
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                  </div>
                );
              }}
            </form.Field>
            <form.Field name="colour">
              {(field) => (
                <fieldset className="flex flex-col gap-1.5 pt-1">
                  <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {t("albums.colour")}
                  </legend>
                  <div className="flex flex-wrap gap-1">
                    {albumColours.map((colour) => {
                      const name = t(`albums.colours.${colour}`);
                      const picked = field.state.value === colour;
                      return (
                        <label key={colour} title={name}>
                          <input
                            type="radio"
                            name={`${baseId}-colour`}
                            value={colour}
                            checked={picked}
                            onChange={() => field.handleChange(colour)}
                            aria-label={name}
                            className="peer sr-only"
                          />
                          <span className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-100 hover:bg-muted peer-checked:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                            <span
                              className="flex size-4 items-center justify-center rounded-full"
                              style={{ background: albumColourValues[colour] }}
                            >
                              {picked && (
                                <Check
                                  className="size-3 text-white"
                                  strokeWidth={3}
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </form.Field>
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
                <Button type="button" variant="ghost">
                  {t("albums.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {album ? t("albums.save") : t("albums.create")}
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
    </Dialog>
  );
}
