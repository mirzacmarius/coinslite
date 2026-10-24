"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import Link from "next/link";
import { AlbumDot } from "./album-colours";
import { useAlbums } from "./use-albums";

/**
 * The person's Albums in a row under the Collection page's summary strip
 * (spec 7), each opening its Album; the row scrolls sideways when they don't
 * all fit. Nothing while they load, or with no Album yet.
 */
export function AlbumsRow() {
  const t = useI18n();
  const format = useFormatters();
  const albums = useAlbums();
  if (!albums?.length) return null;
  return (
    <nav aria-label={t("nav.albums")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {albums.map((album) => (
          <li key={album._id}>
            <Link
              href={`/albums/${album._id}`}
              className="flex h-8 max-w-60 items-center gap-2 rounded-lg border bg-card px-3 text-ui outline-none transition-colors duration-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <AlbumDot colour={album.colour} className="size-2.5" />
              <span className="truncate">{album.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                <span className="sr-only">{t("albums.itemCount")} </span>
                {format.number(album.ownedItemCount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
