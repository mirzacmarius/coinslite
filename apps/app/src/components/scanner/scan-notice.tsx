"use client";

import { useI18n } from "@/locales/client";
import { photoSides } from "@coinslite/backend/convex/photos/rules";
import { ScanLine } from "lucide-react";
import type { ScanPreset } from "./scan-preset";

/**
 * Atop the "New Item" form after a scan: says the details are the scanner's
 * suggestions for the person to check, and shows the photos the Item gets.
 */
export function ScanNotice({ scan }: { scan: ScanPreset }) {
  const t = useI18n();
  const photos = photoSides.flatMap((side) => {
    const photo = scan.photos[side];
    return photo ? [{ side, url: photo.url }] : [];
  });
  return (
    <section
      aria-label={t(
        scan.suggestion ? "scanner.suggested" : "scanner.photosFromScan",
      )}
      className="flex items-center gap-3 rounded-md border bg-muted/40 p-2"
    >
      {photos.length > 0 && (
        <div className="flex shrink-0 gap-1.5">
          {photos.map(({ side, url }) => (
            <img
              key={side}
              src={url}
              alt={t(
                `photos.sides.${side === "front" ? "obverse" : "reverse"}`,
              )}
              className="size-12 rounded-md border bg-background object-contain"
            />
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex items-center gap-1.5 text-[13px] font-medium">
          <ScanLine className="size-4" strokeWidth={1.75} aria-hidden="true" />
          {t(scan.suggestion ? "scanner.suggested" : "scanner.photosFromScan")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t(scan.suggestion ? "scanner.reviewHint" : "scanner.photosHint")}
        </p>
      </div>
    </section>
  );
}
