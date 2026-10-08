"use client";

import { SignOut } from "@/components/sign-out";
import { useI18n } from "@/locales/client";
import { Card } from "@coinslite/ui/card";
import Link from "next/link";
import { navItems } from "./navigation";

/** On phones, Account also holds what the sidebar holds on bigger screens. */
export function PhoneAccountLinks() {
  const t = useI18n();
  const albums = navItems.find(({ key }) => key === "albums");
  return (
    <Card className="flex flex-col gap-1 p-2 md:hidden">
      <h2 className="px-2 pt-1 text-xs font-semibold text-muted-foreground">
        {t("shell.more")}
      </h2>
      {albums && (
        <Link
          href={albums.href}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-muted"
        >
          <albums.icon className="size-4" aria-hidden="true" />
          {t("nav.albums")}
        </Link>
      )}
      <SignOut />
    </Card>
  );
}
