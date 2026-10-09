"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { useQuery } from "convex/react";
import { Pencil, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlbumDot } from "./album-colours";
import { AlbumFormDialog } from "./album-form-dialog";
import { AlbumItems } from "./album-items";
import { DeleteAlbumDialog } from "./delete-album-dialog";

/** One Album: its name, colour and description, then the Items in it. */
export function AlbumDetail() {
  const t = useI18n();
  const router = useRouter();
  const { albumId } = useParams<{ albumId: string }>();
  const album = useQuery(api.albums.get, { albumId });
  // Each opening starts the dialog afresh from the Album as it is now.
  const [editing, setEditing] = useState({ open: false, key: 0 });
  const [deleting, setDeleting] = useState({ open: false, key: 0 });
  // Once deleted, the Album is gone before the page has moved on.
  const [leaving, setLeaving] = useState(false);
  const parent = (
    <Link href="/albums" className="hover:text-foreground">
      {t("nav.albums")}
    </Link>
  );

  if (album === undefined || (album === null && leaving)) {
    return <HeaderBar parent={parent} title="" />;
  }
  if (album === null) {
    return (
      <>
        <HeaderBar parent={parent} title={t("albums.notFoundTitle")} />
        <div className="p-4">
          <EmptyState
            icon={
              <SearchX
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("albums.notFoundTitle")}
            description={t("albums.notFound")}
            action={
              <Link
                href="/albums"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("albums.backToAlbums")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderBar
        parent={parent}
        title={album.name}
        actions={
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                setEditing(({ key }) => ({ open: true, key: key + 1 }))
              }
            >
              <Pencil aria-hidden="true" />
              {t("albums.edit")}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              onClick={() =>
                setDeleting(({ key }) => ({ open: true, key: key + 1 }))
              }
            >
              <Trash2 aria-hidden="true" />
              {t("albums.delete")}
            </Button>
          </>
        }
      />
      <AlbumFormDialog
        key={`edit-${editing.key}`}
        album={album}
        open={editing.open}
        onOpenChange={(open) => setEditing(({ key }) => ({ open, key }))}
      />
      <DeleteAlbumDialog
        key={`delete-${deleting.key}`}
        album={album}
        open={deleting.open}
        onOpenChange={(open) => setDeleting(({ key }) => ({ open, key }))}
        onPendingChange={setLeaving}
        onDeleted={() => router.push("/albums")}
      />
      <div className="flex items-start gap-3 border-b p-4">
        <span className="flex h-6 shrink-0 items-center">
          <AlbumDot colour={album.colour} className="size-2.5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-medium">{album.name}</h2>
          {album.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {album.description}
            </p>
          )}
        </div>
      </div>
      <AlbumItems albumId={album._id} />
    </>
  );
}
