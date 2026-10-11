import { cn } from "../utils";

/** The CoinsLite wordmark: an indigo coin ring and the product name. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 shrink-0 text-primary"
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <circle
          cx="12"
          cy="12"
          r="6.5"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.6"
        />
      </svg>
      CoinsLite
    </span>
  );
}
