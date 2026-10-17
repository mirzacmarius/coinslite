"use client";

import { useI18n } from "@/locales/client";
import { userSearchLimit } from "@coinslite/backend/convex/admin/userList";
import { Input } from "@coinslite/ui/input";
import { Search, X } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

/** How long typing pauses before the search runs. */
const pause = 250;

/**
 * The user list's search field. What's typed goes to the URL after a short
 * pause (or at once on Enter); a search changed by Back or clearing shows
 * here. Esc clears it.
 */
export const UserSearch = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (search: string) => void }
>(function UserSearch({ value, onChange }, ref) {
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

  const clear = () => {
    setText("");
    onChange("");
  };

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
        maxLength={userSearchLimit}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onChange(text);
          if (event.key === "Escape" && text !== "") {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={t("adminUsers.searchPlaceholder")}
        aria-label={t("adminUsers.search")}
        className="h-7 w-full pl-7 pr-7 text-ui transition-[width] duration-150 ease-out sm:w-[15rem] sm:focus:w-[18.75rem] [&::-webkit-search-cancel-button]:hidden"
      />
      {text !== "" && (
        <button
          type="button"
          aria-label={t("adminUsers.clearSearch")}
          onClick={clear}
          className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
