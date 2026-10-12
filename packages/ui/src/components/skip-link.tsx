/** First focusable element on every page: jumps keyboard users past the navigation. */
export function SkipLink({
  href = "#main",
  label,
}: {
  href?: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
    >
      {label}
    </a>
  );
}
