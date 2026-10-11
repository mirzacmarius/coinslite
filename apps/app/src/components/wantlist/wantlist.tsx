"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { wantErrors, wantLimits } from "@coinslite/backend/convex/wants/rules";
import { Button } from "@coinslite/ui/button";
import { ActionLabel } from "@coinslite/ui/header-bar";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

/** Where the Wantlist lives: beside the Catalog it lists entries of. */
export const wantlistHref = "/catalog/wantlist";

/** The keys of the Catalog entries the person wants; undefined while loading. */
export function useWantedKeys() {
  const keys = useQuery(api.wants.keys, {});
  return useMemo(() => keys && new Set(keys), [keys]);
}

/** What went wrong changing the Wantlist, in words. */
export function useWantError() {
  const t = useI18n();
  return (failure: unknown) =>
    failure instanceof ConvexError && failure.data === wantErrors.tooManyWants
      ? t("wantlist.errors.tooMany", { limit: wantLimits.wants })
      : t("wantlist.errors.failed");
}

/** Wants a Catalog entry or stops wanting it, saying so. */
export function useSetWanted() {
  const t = useI18n();
  const router = useRouter();
  const setWanted = useMutation(api.wants.setWanted);
  const errorMessage = useWantError();
  return async (key: string, wanted: boolean) => {
    try {
      await setWanted({ key, wanted });
    } catch (failure) {
      toast.error(errorMessage(failure));
      return;
    }
    if (!wanted) {
      toast.success(t("wantlist.removed"));
      return;
    }
    toast.success(t("wantlist.added"), {
      action: {
        label: t("wantlist.open"),
        onClick: () => router.push(wantlistHref),
      },
    });
  };
}

/** A small heart beside an entry the person wants. */
export function WantedMark({ className }: { className?: string }) {
  const t = useI18n();
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Heart
        className="size-3.5 fill-current text-link"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="sr-only">{t("wantlist.mark")}</span>
    </span>
  );
}

/** The heart that wants or stops wanting one entry, on rows of a list. */
export function WantToggle({
  entryKey,
  title,
  wanted,
}: {
  entryKey: string;
  title: string;
  wanted: boolean;
}) {
  const t = useI18n();
  const setWanted = useSetWanted();
  return (
    <button
      type="button"
      aria-pressed={wanted}
      aria-label={t(wanted ? "wantlist.unwantEntry" : "wantlist.wantEntry", {
        title,
      })}
      onClick={() => void setWanted(entryKey, !wanted)}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Heart
        className={cn("size-4", wanted && "fill-current text-link")}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </button>
  );
}

/** "Want" on a Catalog entry's page: pressed while the entry is on the Wantlist. */
export function WantButton({ entryKey }: { entryKey: string }) {
  const t = useI18n();
  const wantedKeys = useWantedKeys();
  const setWanted = useSetWanted();
  const wanted = wantedKeys?.has(entryKey) ?? false;
  return (
    <Button
      variant="ghost"
      size="xs"
      aria-pressed={wanted}
      disabled={wantedKeys === undefined}
      onClick={() => void setWanted(entryKey, !wanted)}
    >
      <Heart
        className={cn(wanted && "fill-current text-link")}
        aria-hidden="true"
      />
      <ActionLabel>
        {t(wanted ? "wantlist.wanted" : "wantlist.want")}
      </ActionLabel>
    </Button>
  );
}

/** The way to the Wantlist from the Catalog's header. */
export function WantlistLink() {
  const t = useI18n();
  return (
    <Button asChild variant="ghost" size="xs">
      <Link href={wantlistHref}>
        <Heart aria-hidden="true" />
        <ActionLabel>{t("wantlist.title")}</ActionLabel>
      </Link>
    </Button>
  );
}
