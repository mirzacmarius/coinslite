"use client";

import { updatesHref } from "@/components/updates/updates-href";
import { useUpdatesStatus } from "@/components/updates/use-updates-status";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ChartColumn,
  CreditCard,
  FileSpreadsheet,
  ListTree,
  type LucideIcon,
  Sparkles,
  ToggleRight,
  UserRound,
  UsersRound,
} from "lucide-react";

export type SettingsLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** A release the person hasn't seen yet (Updates only). */
  unseen?: boolean;
};

/**
 * What "Settings" holds: the account, plans and updates, and for admins the
 * admin areas, which stay out of sight for everyone else. The sidebar lists
 * them under Settings; the phone top bar's menu lists them too.
 */
export function useSettingsLinks(): SettingsLink[] {
  const t = useI18n();
  const isAdmin = useQuery(api.admin.roles.isAdmin);
  const unseen = useUpdatesStatus()?.unseen === true;
  return [
    { href: "/settings", label: t("nav.account"), icon: UserRound },
    { href: "/settings/billing", label: t("shell.plans"), icon: CreditCard },
    { href: updatesHref, label: t("updates.title"), icon: Sparkles, unseen },
    ...(isAdmin
      ? [
          {
            href: "/admin/catalog/editor",
            label: t("catalogEditor.menu"),
            icon: ListTree,
          },
          {
            href: "/admin/catalog",
            label: t("catalogAdmin.menu"),
            icon: FileSpreadsheet,
          },
          {
            href: "/admin/stats",
            label: t("adminStats.menu"),
            icon: ChartColumn,
          },
          {
            href: "/admin/flags",
            label: t("featureFlags.menu"),
            icon: ToggleRight,
          },
          {
            href: "/admin/users",
            label: t("adminUsers.menu"),
            icon: UsersRound,
          },
        ]
      : []),
  ];
}
