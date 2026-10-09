"use client";

import { useI18n } from "@/locales/client";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import type * as React from "react";
import { type NavKey, navItems } from "./navigation";

/**
 * Stands in for a section that a later release fills in. Rendered in the
 * browser from the loaded dictionary, so it appears the moment a link is clicked.
 */
export function PlaceholderPage({
  section,
  actions,
}: {
  section: NavKey;
  /** What the section already offers, in its header. */
  actions?: React.ReactNode;
}) {
  const t = useI18n();
  const Icon = navItems.find(({ key }) => key === section)?.icon;
  return (
    <>
      <HeaderBar title={t(`nav.${section}`)} actions={actions} />
      <div className="p-4">
        <EmptyState
          icon={
            Icon && (
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
            )
          }
          title={t("placeholder.title")}
          description={t("placeholder.description")}
        />
      </div>
    </>
  );
}
