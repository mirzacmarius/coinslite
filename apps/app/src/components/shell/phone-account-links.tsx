"use client";

import { useI18n } from "@/locales/client";
import Link from "next/link";
import { navItems } from "./navigation";
import { useSettingsLinks } from "./settings-links";

const linkClass =
  "flex h-9 items-center gap-2 rounded-md px-2 text-ui font-medium hover:bg-muted";

/**
 * On phones, Account also links to what has no tab of its own: Albums, and
 * for admins the admin areas the sidebar lists under Settings.
 */
export function PhoneAccountLinks() {
  const t = useI18n();
  const albums = navItems.find(({ key }) => key === "albums");
  const adminLinks = useSettingsLinks().filter(({ href }) =>
    href.startsWith("/admin"),
  );
  return (
    <nav aria-label={t("shell.more")} className="md:hidden">
      {albums && (
        <Link href={albums.href} className={linkClass}>
          <albums.icon
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {t("nav.albums")}
        </Link>
      )}
      {adminLinks.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={linkClass}>
          <Icon
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {label}
        </Link>
      ))}
    </nav>
  );
}
