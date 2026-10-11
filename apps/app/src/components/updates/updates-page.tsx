"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { releaseGroups } from "@coinslite/backend/convex/updates/releases";
import { Badge } from "@coinslite/ui/badge";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useId } from "react";

type Release = FunctionReturnType<typeof api.updates.list>[number];

/** Updates: every release, newest first. Opening it marks the latest as seen. */
export function UpdatesPage() {
  const language = useCurrentLocale();
  const releases = useQuery(api.updates.list, { language });
  const markSeen = useMutation(api.updates.markSeen);
  useEffect(() => {
    // If this fails, the marker stays until the next visit: nothing else to do.
    markSeen({}).catch(() => undefined);
  }, [markSeen]);

  if (!releases)
    return (
      <div
        className="h-40 animate-pulse rounded-lg bg-muted"
        aria-hidden="true"
      />
    );
  return releases.map((release, index) => (
    <ReleaseNotes
      key={release.version}
      release={release}
      latest={index === 0}
    />
  ));
}

function ReleaseNotes({
  release,
  latest,
}: {
  release: Release;
  latest: boolean;
}) {
  const t = useI18n();
  const { date } = useFormatters();
  const id = useId();
  return (
    <article
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id={id} className="text-sm font-medium">
            {t("updates.version", { version: release.version })}
          </h2>
          {latest && <Badge>{t("updates.latest")}</Badge>}
        </div>
        <time dateTime={release.date} className="text-xs text-muted-foreground">
          {date(release.date)}
        </time>
      </header>
      {releaseGroups
        .filter((group) => release[group].length > 0)
        .map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t(`updates.groups.${group}`)}
            </h3>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm marker:text-muted-foreground">
              {release[group].map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        ))}
    </article>
  );
}
