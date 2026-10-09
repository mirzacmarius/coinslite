"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type * as React from "react";
import { useRef } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";

export type ViewerPhoto = { src: string; caption: string };

export type PhotoViewerProps = {
  /** Which photo is open; null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  photos: ViewerPhoto[];
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
};

const overlayButton =
  "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/60 focus-visible:ring-offset-0";

/**
 * Full-screen look at one photo. With several, arrow buttons and the Left and
 * Right keys step through them; Esc closes.
 */
export function PhotoViewer({
  index,
  onIndexChange,
  photos,
  closeLabel,
  previousLabel,
  nextLabel,
}: PhotoViewerProps) {
  // The last photo stays in place while the viewer fades out.
  const last = useRef(0);
  if (index !== null) last.current = index;
  const shown = index ?? last.current;
  const photo = photos[shown];
  const count = photos.length;
  const step = (by: number) => {
    if (index !== null) onIndexChange((index + by + count) % count);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  };

  return (
    <Dialog
      open={index !== null && photo !== undefined}
      onOpenChange={(open) => !open && onIndexChange(null)}
    >
      <DialogContent
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        className="inset-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-hidden rounded-none border-0 bg-black/90 shadow-none sm:inset-0 sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none"
      >
        {photo && (
          <>
            <DialogTitle className="sr-only">{photo.caption}</DialogTitle>
            <img
              src={photo.src}
              alt={photo.caption}
              className="size-full object-contain p-4 sm:p-14"
            />
            <p className="absolute bottom-3 left-4 text-xs text-white/70">
              {photo.caption}
              {count > 1 && ` · ${shown + 1} / ${count}`}
            </p>
          </>
        )}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            className={cn("absolute right-3 top-3", overlayButton)}
          >
            <X />
          </Button>
        </DialogClose>
        {count > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={previousLabel}
              onClick={() => step(-1)}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2",
                overlayButton,
              )}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={nextLabel}
              onClick={() => step(1)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                overlayButton,
              )}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
