"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type FeatureFlag,
  type FeatureFlags,
  scannerAvailabilities,
} from "@coinslite/backend/convex/featureFlags/rules";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { Switch } from "@coinslite/ui/switch";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { ShieldOff } from "lucide-react";
import type * as React from "react";
import { useId } from "react";

/**
 * The admins' feature flags: whether the Catalog shows, and who may use the
 * scanner. A change saves at once and applies to everyone. Everyone else
 * finds nothing here; the backend refuses them too.
 */
export function FeatureFlagsPage() {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  const flags = useQuery(api.featureFlags.list, isAdmin ? {} : "skip");

  return (
    <>
      <HeaderBar title={t("featureFlags.title")} />
      {isAdmin === false ? (
        <div className="p-4">
          <EmptyState
            icon={
              <ShieldOff
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("featureFlags.notAvailable")}
            description={t("featureFlags.notAvailableDescription")}
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-4">
          {flags === undefined ? (
            <div
              className="h-40 animate-pulse rounded-lg bg-muted"
              aria-hidden="true"
            />
          ) : (
            <FlagSettings flags={flags} />
          )}
        </div>
      )}
    </>
  );
}

function FlagSettings({ flags }: { flags: FeatureFlags }) {
  const t = useI18n();
  const switchId = useId();
  const setFlag = useMutation(api.featureFlags.set).withOptimisticUpdate(
    (store, { flag }) => {
      const current = store.getQuery(api.featureFlags.list, {});
      if (!current) return;
      store.setQuery(
        api.featureFlags.list,
        {},
        flag.key === "catalogVisible"
          ? { ...current, catalogVisible: flag.value }
          : { ...current, scannerAvailability: flag.value },
      );
    },
  );

  const save = async (flag: FeatureFlag) => {
    try {
      await setFlag({ flag });
      toast.success(t("featureFlags.saved"));
    } catch {
      toast.error(t("featureFlags.saveFailed"));
    }
  };

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {t("featureFlags.description")}
      </p>
      <div className="divide-y rounded-xl bg-card">
        <FlagRow
          label={
            <label htmlFor={switchId} className="text-ui font-medium">
              {t("featureFlags.catalog")}
            </label>
          }
          description={t("featureFlags.catalogDescription")}
          descriptionId={`${switchId}-description`}
        >
          <Switch
            id={switchId}
            aria-describedby={`${switchId}-description`}
            checked={flags.catalogVisible}
            onCheckedChange={(value) =>
              void save({ key: "catalogVisible", value })
            }
          />
        </FlagRow>
        <FlagRow
          label={
            <p className="text-ui font-medium">{t("featureFlags.scanner")}</p>
          }
          description={t("featureFlags.scannerDescription")}
        >
          <SegmentedControl
            label={t("featureFlags.scanner")}
            options={scannerAvailabilities.map((value) => ({
              value,
              label: t(`featureFlags.scannerOptions.${value}`),
            }))}
            value={flags.scannerAvailability}
            onChange={(value) =>
              void save({ key: "scannerAvailability", value })
            }
          />
        </FlagRow>
      </div>
    </>
  );
}

/** One flag: its name and what it does on the left, its control on the right (below on phones). */
function FlagRow({
  label,
  description,
  descriptionId,
  children,
}: {
  label: React.ReactNode;
  description: string;
  descriptionId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        {label}
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
