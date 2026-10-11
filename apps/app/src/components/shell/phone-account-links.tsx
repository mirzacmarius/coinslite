"use client";

import { useI18n } from "@/locales/client";
import Link from "next/link";
import { navItems } from "./navigation";

/** On phones, Account also links to what has no tab of its own. */
export function PhoneAccountLinks() {
  const t = useI18n();
  const albums = navItems.find(({ key }) => key === "albums");
  if (!albums) return null;
  return (
    <nav aria-label={t("shell.more")} className="md:hidden">
      <Link
        href={albums.href}
        className="flex h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium hover:bg-muted"
      >
        <albums.icon
          className="size-4 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("nav.albums")}
      </Link>
    </nav>
  );
}
