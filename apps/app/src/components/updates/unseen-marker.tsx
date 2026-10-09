import { cn } from "@coinslite/ui/utils";

/**
 * The dot on Account's entry points while a release hasn't been seen in
 * Updates. It's decorative: say "New release" in words next to it for screen readers.
 */
export function UnseenMarker({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full bg-primary", className)}
    />
  );
}
