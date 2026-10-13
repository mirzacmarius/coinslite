import { cn } from "@coinslite/ui/utils";

/**
 * The site's primary button: ink and square. On hover its label slides out
 * on a runner while a copy slides in behind it, and the arrow travels on.
 */
export function PrimaryAction({
  href,
  children,
  light = false,
  className,
}: {
  href: string;
  children: string;
  /** For velvet grounds. */
  light?: boolean;
  className?: string;
}) {
  return (
    <a href={href} className={cn("btn", light && "btn--light", className)}>
      <span className="btn__label" data-label={children}>
        <span>{children}</span>
      </span>
      <span className="btn__arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}
