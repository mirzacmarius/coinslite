"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  albumErrors,
  albumLimits,
} from "@coinslite/backend/convex/albums/rules";
import { useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useMemo } from "react";

/**
 * The person's Albums in name order for their language; undefined while
 * loading, or while `enabled` is false (e.g. a closed dialog).
 */
export function useAlbums(enabled = true) {
  const albums = useQuery(api.albums.list, enabled ? {} : "skip");
  const locale = useCurrentLocale();
  return useMemo(
    () =>
      albums &&
      [...albums].sort((a, b) =>
        a.name.localeCompare(b.name, locale, { sensitivity: "base" }),
      ),
    [albums, locale],
  );
}

/** Turns a failed Album save into a message, falling back to `fallback`. */
export function useAlbumError() {
  const t = useI18n();
  return (failure: unknown, fallback: string) => {
    const code = failure instanceof ConvexError ? String(failure.data) : "";
    switch (code) {
      case albumErrors.nameRequired:
        return t("albums.errors.nameRequired");
      // The form keeps a description short enough, so it's the name.
      case albumErrors.tooLong:
        return t("albums.errors.nameTooLong", { max: albumLimits.name });
      case albumErrors.tooMany:
        return t("albums.errors.tooMany", { max: albumLimits.count });
      default:
        return fallback;
    }
  };
}
