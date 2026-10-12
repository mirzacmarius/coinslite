import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0 text-xs font-medium",
  {
    variants: {
      variant: {
        /** Quiet by default; prefer a dot and text in lists. */
        default: "bg-transparent text-muted-foreground",
        outline: "bg-transparent text-foreground",
        success: "border-transparent bg-success text-success-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
