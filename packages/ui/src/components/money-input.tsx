import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "../utils";
import { Input, type InputProps } from "./input";

/** The currencies an amount may be typed in, picked inside the field. */
export type CurrencyPicker = {
  /** The currency codes offered, the field's own among them. */
  currencies: readonly string[];
  onChange: (currency: string) => void;
  /** What the picker is, for screen readers ("Currency paid in"). */
  label: string;
};

/**
 * An amount field with its currency shown inside, right-aligned. It takes the
 * text as typed; the caller parses it in the user's language. With
 * `currencyPicker` the currency is a menu, for an amount paid in another
 * currency.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { currency: string; currencyPicker?: CurrencyPicker }
>(({ currency, currencyPicker, className, ...props }, ref) => (
  <div className="relative">
    <Input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      className={cn(
        "text-right tabular-nums",
        currencyPicker ? "pr-[4.25rem]" : "pr-12",
        className,
      )}
      {...props}
    />
    {currencyPicker ? (
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        <select
          aria-label={currencyPicker.label}
          value={currency}
          disabled={props.disabled}
          onChange={(event) => currencyPicker.onChange(event.target.value)}
          className="h-6 cursor-pointer appearance-none rounded-sm bg-transparent pl-1.5 pr-5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {currencyPicker.currencies.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-1 size-3 text-muted-foreground"
        />
      </div>
    ) : (
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        {currency}
      </span>
    )}
  </div>
));
MoneyInput.displayName = "MoneyInput";
