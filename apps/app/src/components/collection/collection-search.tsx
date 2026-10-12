"use client";

import { useI18n } from "@/locales/client";
import { searchLimit } from "@coinslite/backend/convex/collection/view";
import { Input } from "@coinslite/ui/input";
import { Search, X } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

/** How long typing pauses before the search runs. */
const pause = 250;

/**
 * The Collection's search field. What's typed goes to the URL after a short
 * pause (or at once on Enter); a search changed elsewhere, by Back or
 * clearing the filters, shows here. Esc clears it.
 */
export const CollectionSearch = forwardRef<
  HTMLInputElement,
  { value: string | undefined; onChange: (search: string) => void }
>(function CollectionSearch({ value = "", onChange }, ref) {
  const t = useI18n();
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value);
  }

  useEffect(() => {
    if (text.trim() === value.trim()) return;
    const timer = setTimeout(() => onChange(text), pause);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <Input
        ref={ref}
        type="search"
        value={text}
        maxLength={searchLimit}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onChange(text);
          if (event.key === "Escape" && text !== "") {
            event.preventDefault();
            setText("");
            onChange("");
          }
        }}
        placeholder={t("collection.searchPlaceholder")}
        aria-label={t("collection.search")}
        className="h-7 w-full pl-7 pr-7 text-[13px] transition-[width] duration-150 ease-out sm:w-[220px] sm:focus:w-[300px] [&::-webkit-search-cancel-button]:hidden"
      />
      {text !== "" && (
        <button
          type="button"
          aria-label={t("collection.clearSearch")}
          onClick={() => {
            setText("");
            onChange("");
          }}
          // 24 × 24 px at least: the smallest target WCAG 2.2 allows.
          className="absolute right-0.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
