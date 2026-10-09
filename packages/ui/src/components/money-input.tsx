import * as React from "react";
import { cn } from "../utils";
import { Input, type InputProps } from "./input";

/**
 * An amount field with its currency shown inside, right-aligned. It takes the
 * text as typed; the caller parses it in the user's language.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { currency: string }
>(({ currency, className, ...props }, ref) => (
  <div className="relative">
    <Input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      className={cn("pr-12 text-right tabular-nums", className)}
      {...props}
    />
    <span
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
      aria-hidden="true"
    >
      {currency}
    </span>
  </div>
));
MoneyInput.displayName = "MoneyInput";
