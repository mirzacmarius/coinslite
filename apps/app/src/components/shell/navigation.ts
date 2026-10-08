import { locales } from "@coinslite/i18n";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  Library,
  type LucideIcon,
  UserRound,
} from "lucide-react";

export type NavKey =
  | "overview"
  | "collection"
  | "catalog"
  | "albums"
  | "account";

export type NavItem = {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  /** Whether the item is one of the four tabs on phones. */
  onPhoneTabs: boolean;
};

export const navItems: NavItem[] = [
  { key: "overview", href: "/", icon: LayoutDashboard, onPhoneTabs: true },
  { key: "collection", href: "/collection", icon: Library, onPhoneTabs: true },
  { key: "catalog", href: "/catalog", icon: BookOpen, onPhoneTabs: true },
  { key: "albums", href: "/albums", icon: FolderOpen, onPhoneTabs: false },
  { key: "account", href: "/settings", icon: UserRound, onPhoneTabs: true },
];

/** A nav item is current when the path is its href or a page below it. */
const localePrefix = new RegExp(`^/(${locales.join("|")})(?=/|$)`);

export function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(localePrefix, "") || "/";
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(`${href}/`);
}
