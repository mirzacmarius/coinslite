import type { AlbumColour } from "@coinslite/backend/convex/albums/rules";
import { cn } from "@coinslite/ui/utils";

/** How each palette colour looks: mid tones that read on light and dark backgrounds. */
export const albumColourValues: Record<AlbumColour, string> = {
  grey: "#64748b",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
};

/** An Album's colour as a small dot beside its name. */
export function AlbumDot({
  colour,
  className,
}: { colour: AlbumColour; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ background: albumColourValues[colour] }}
    />
  );
}
