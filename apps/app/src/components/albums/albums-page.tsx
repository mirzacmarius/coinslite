"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlbumDot } from "./album-colours";
import { AlbumFormDialog } from "./album-form-dialog";
import { useAlbums } from "./use-albums";

/** Every Album with its description and how many Items it holds. */
export function AlbumsPage() {
  const t = useI18n();
  const format = useFormatters();
  const albums = useAlbums();
  // Each opening starts the form afresh.
  const [creating, setCreating] = useState({ open: false, key: 0 });
  const newAlbum = () =>
    setCreating(({ key }) => ({ open: true, key: key + 1 }));

  return (
    <>
      <HeaderBar
        title={t("nav.albums")}
        actions={
          <Button size="xs" onClick={newAlbum}>
            <Plus aria-hidden="true" />
            {t("albums.new")}
          </Button>
        }
      />
      <AlbumFormDialog
        key={creating.key}
        open={creating.open}
        onOpenChange={(open) => setCreating(({ key }) => ({ open, key }))}
      />
      {albums === undefined ? (
        <ListSkeleton />
      ) : albums.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={
              <FolderOpen
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("albums.emptyTitle")}
            description={t("albums.emptyDescription")}
            action={<Button onClick={newAlbum}>{t("albums.new")}</Button>}
          />
        </div>
      ) : (
        <ul className="divide-y border-b">
          {albums.map((album) => (
            <li key={album._id}>
              <Link
                href={`/albums/${album._id}`}
                className="flex min-h-11 items-center gap-3 px-4 py-1.5 outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <AlbumDot colour={album.colour} className="size-2.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {album.name}
                  </span>
                  {album.description && (
                    <span className="truncate text-xs text-muted-foreground">
                      {album.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  <span className="sr-only">{t("albums.itemCount")} </span>
                  {format.number(album.itemCount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y border-b" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex min-h-11 items-center gap-3 px-4 py-1.5">
          <span className="size-8 animate-pulse rounded-md bg-muted" />
          <span className="h-3.5 w-48 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
