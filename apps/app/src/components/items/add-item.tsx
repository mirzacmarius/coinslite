"use client";

import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Kbd } from "@coinslite/ui/kbd";
import { SidebarMenuButton, SidebarMenuItem } from "@coinslite/ui/sidebar";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * The New Item page (new-item.tsx), where adding an Item starts: the Add
 * Item buttons link to it, and C opens it.
 */
export const newItemHref = "/collection/new";

/** C opens the New Item page from anywhere in the app (lib/use-shortcut.ts). */
export function AddItemShortcut() {
  const router = useRouter();
  useShortcut("c", () => router.push(newItemHref));
  return null;
}

/**
 * The sidebar's first quick action, in the accent colour and, while the
 * sidebar is expanded, taller than the rows below it: from tablet width up
 * the Add Item button, as phones, where there's no sidebar, have theirs in
 * the tabs (AddItemTabButton). Its focus ring stands off it, which is the
 * same colour.
 */
export function AddItemQuickAction() {
  const t = useI18n();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={t("items.add")}
        className="h-9 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground"
      >
        <Link href={newItemHref}>
          <Plus aria-hidden="true" />
          <span>{t("items.add")}</span>
          <Kbd className="ml-auto border-primary-foreground/40 bg-transparent text-primary-foreground group-data-[collapsible=icon]:hidden">
            C
          </Kbd>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * The phones' Add Item button: round, in the accent colour, in the middle of
 * the tabs along the bottom, where a thumb reaches it on every page. Its
 * focus ring stands off it, which is the same colour.
 */
export function AddItemTabButton() {
  const t = useI18n();
  return (
    <Button
      asChild
      size="icon"
      className="size-11 rounded-full shadow-md ring-offset-card transition-[color,background-color,transform] focus-visible:ring-offset-2 active:scale-95 [&_svg]:size-6"
    >
      <Link href={newItemHref} aria-label={t("items.add")}>
        <Plus aria-hidden="true" />
      </Link>
    </Button>
  );
}
