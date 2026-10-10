"use client";

import { useI18n } from "@/locales/client";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Fragment } from "react";
import { catalogHref } from "./catalog-levels";

export type Crumb = { href: string; label: string };

/**
 * The header of every Catalog level: the way back up (Catalog › United
 * States › Morgan dollar) before the level's title, and the Catalog's actions.
 * On phones only the level just above shows.
 */
export function CatalogHeader({
  crumbs,
  title,
  actions,
}: {
  /** The levels between the Catalog and this one; none for the Catalog itself. */
  crumbs?: Crumb[];
  title: string;
  actions?: React.ReactNode;
}) {
  const t = useI18n();
  if (!crumbs) {
    return <HeaderBar title={title} actions={actions} />;
  }
  const trail = [{ href: catalogHref, label: t("nav.catalog") }, ...crumbs];
  return (
    <HeaderBar
      title={title}
      actions={actions}
      parent={trail.map((crumb, index) => {
        const nearest = index === trail.length - 1;
        return (
          <Fragment key={crumb.href}>
            <Link
              href={crumb.href}
              className={
                nearest
                  ? "max-w-24 truncate hover:text-foreground md:max-w-48"
                  : "hidden max-w-40 truncate hover:text-foreground md:inline"
              }
            >
              {crumb.label}
            </Link>
            {!nearest && (
              <ChevronRight
                className="hidden size-3.5 md:block"
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    />
  );
}
