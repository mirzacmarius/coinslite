"use client";

import { useMoney } from "@/components/account/home-currency-change";
import { AlbumDot } from "@/components/albums/album-colours";
import { useAlbums } from "@/components/albums/use-albums";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type ReportColumn,
  baseColumns,
  defaultColumns,
  reportColumns,
} from "@coinslite/backend/convex/insuranceReport/rules";
import { Button } from "@coinslite/ui/button";
import { Checkbox } from "@coinslite/ui/checkbox";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useId, useMemo, useRef, useState } from "react";

type Account = NonNullable<FunctionReturnType<typeof api.account.get>>;
type ScopeKind = "collection" | "albums";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-40 animate-pulse rounded-lg bg-muted", className)}
      aria-hidden="true"
    />
  );
}

/**
 * The Insurance report: on Premium, choose which Items and values it covers,
 * check the preview, then download the PDF. On the Free plan, the way to
 * Premium.
 */
export function InsuranceReportPage() {
  const account = useQuery(api.account.get);
  if (!account) return <Skeleton />;
  return account.plan === "premium" ? (
    <ReportBuilder account={account} />
  ) : (
    <LockedReport />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-sm font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function LockedReport() {
  const t = useI18n();
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl bg-card p-4">
      <ShieldCheck
        className="size-4 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">
          {t("insuranceReport.lockedTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("insuranceReport.lockedDescription")}
        </p>
      </div>
      <Button asChild>
        <Link href="/settings/billing">{t("plans.upgradeToPremium")}</Link>
      </Button>
    </section>
  );
}

/**
 * The latest value that has arrived: while a query with new arguments loads,
 * the previous result stays on screen instead of a skeleton.
 */
function useLatest<T>(value: T | undefined) {
  const latest = useRef(value);
  if (value !== undefined) latest.current = value;
  return latest.current;
}

/** A tickable row in a bordered list: an Album, a value column. */
function CheckRow({
  checked,
  disabled,
  onCheckedChange,
  children,
  aside,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex h-9 items-center gap-2 px-3 text-[13px] transition-colors duration-100",
          disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted",
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {children}
        </span>
        {aside}
      </label>
    </li>
  );
}

const errorKeys = {
  PREMIUM_REQUIRED: "insuranceReport.errors.PREMIUM_REQUIRED",
  REPORT_TOO_LARGE: "insuranceReport.errors.REPORT_TOO_LARGE",
  ALBUM_NOT_FOUND: "insuranceReport.errors.ALBUM_NOT_FOUND",
} as const;

function ReportBuilder({ account }: { account: Account }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const money = useMoney();
  const albums = useAlbums();
  const downloadReport = useAction(api.insuranceReportPdf.download);
  const [scopeKind, setScopeKind] = useState<ScopeKind>("collection");
  const [ticked, setTicked] = useState<ReadonlySet<Id<"albums">>>(new Set());
  const [withoutAlbum, setWithoutAlbum] = useState(false);
  const [columns, setColumns] = useState<ReadonlySet<ReportColumn>>(
    new Set(defaultColumns),
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>();

  // An Album deleted meanwhile drops out of the choice.
  const albumIds = useMemo(
    () =>
      (albums ?? [])
        .filter((album) => ticked.has(album._id))
        .map((album) => album._id),
    [albums, ticked],
  );
  const scope =
    scopeKind === "collection"
      ? { kind: "collection" as const }
      : { kind: "albums" as const, albumIds, withoutAlbum };
  const scopeChosen =
    scopeKind === "collection" || albumIds.length > 0 || withoutAlbum;
  const chosenColumns = reportColumns.filter((column) => columns.has(column));
  const chosenBases = baseColumns.filter((column) => columns.has(column));
  const current = useQuery(
    api.insuranceReport.preview,
    scopeChosen ? { scope, columns: chosenColumns } : "skip",
  );
  const preview = useLatest(current);
  const refreshing = current === undefined && preview !== undefined;
  const ready = preview?.status === "ready" ? preview : undefined;

  const tickAlbum = (albumId: Id<"albums">, checked: boolean) =>
    setTicked((current) => {
      const next = new Set(current);
      if (checked) next.add(albumId);
      else next.delete(albumId);
      return next;
    });
  const chooseColumn = (column: ReportColumn, checked: boolean) =>
    setColumns((current) => {
      const next = new Set(current);
      if (checked) next.add(column);
      else next.delete(column);
      return next;
    });

  const download = async () => {
    setError(undefined);
    setDownloading(true);
    try {
      const { fileName, pdf } = await downloadReport({
        scope,
        columns: chosenColumns,
        language: locale,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const url = URL.createObjectURL(
        new Blob([pdf], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(t("insuranceReport.downloaded"));
    } catch (failure) {
      const code = failure instanceof ConvexError ? String(failure.data) : "";
      setError(
        t(
          code in errorKeys
            ? errorKeys[code as keyof typeof errorKeys]
            : "insuranceReport.failed",
        ),
      );
    } finally {
      setDownloading(false);
    }
  };

  const address = [
    account.streetAddress,
    [account.postalCode, account.city].filter(Boolean).join(" "),
    account.country && format.country(account.country),
  ].filter(Boolean);
  const missingContact =
    !account.fullName || !account.contactPhone || address.length === 0;

  return (
    <>
      <Section
        title={t("insuranceReport.scopeTitle")}
        description={t("insuranceReport.scopeDescription")}
      >
        <SegmentedControl
          label={t("insuranceReport.scope")}
          value={scopeKind}
          onChange={setScopeKind}
          options={[
            {
              value: "collection",
              label: t("insuranceReport.wholeCollection"),
            },
            { value: "albums", label: t("insuranceReport.albums") },
          ]}
        />
        {scopeKind === "albums" && (
          <div className="flex flex-col gap-2">
            <ul
              aria-label={t("insuranceReport.albums")}
              className="max-h-80 divide-y overflow-y-auto rounded-md border"
            >
              <CheckRow
                checked={withoutAlbum}
                onCheckedChange={setWithoutAlbum}
              >
                <span className="truncate">
                  {t("insuranceReport.withoutAlbum")}
                </span>
              </CheckRow>
              {albums?.map((album) => (
                <CheckRow
                  key={album._id}
                  checked={ticked.has(album._id)}
                  onCheckedChange={(checked) => tickAlbum(album._id, checked)}
                  aside={
                    <span className="text-xs text-muted-foreground">
                      <span className="sr-only">{t("albums.itemCount")} </span>
                      {format.number(album.ownedItemCount)}
                    </span>
                  }
                >
                  <AlbumDot colour={album.colour} />
                  <span className="truncate">{album.name}</span>
                </CheckRow>
              ))}
            </ul>
            {albums?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("insuranceReport.noAlbums")}
              </p>
            )}
          </div>
        )}
      </Section>

      <Section
        title={t("insuranceReport.valuesTitle")}
        description={t("insuranceReport.valuesDescription")}
      >
        <div className="flex flex-col gap-2">
          <ul
            aria-label={t("insuranceReport.valuesTitle")}
            className="divide-y rounded-md border"
          >
            {reportColumns.map((column) => (
              <CheckRow
                key={column}
                checked={columns.has(column)}
                // The last of Purchase price, Market value and Metal value stays.
                disabled={chosenBases.length === 1 && chosenBases[0] === column}
                onCheckedChange={(checked) => chooseColumn(column, checked)}
              >
                {t(`insuranceReport.columns.${column}`)}
              </CheckRow>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {t("insuranceReport.keepOne")}
          </p>
        </div>
      </Section>

      <Section
        title={t("insuranceReport.previewTitle")}
        description={t("insuranceReport.previewDescription")}
      >
        {!scopeChosen ? (
          <p className="text-xs text-muted-foreground">
            {t("insuranceReport.chooseScope")}
          </p>
        ) : preview === undefined ? (
          <Skeleton className="h-36 rounded-md" />
        ) : preview.status === "tooLarge" ? (
          <p
            role="status"
            className="rounded-md border bg-muted px-3 py-2 text-xs"
          >
            {t("insuranceReport.tooLarge", {
              limit: format.number(preview.limit),
            })}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <dl
              aria-live="polite"
              aria-busy={refreshing}
              className={cn(
                "flex flex-col divide-y rounded-md border text-[13px] transition-opacity duration-150",
                refreshing && "opacity-60",
              )}
            >
              <PreviewRow label={t("insuranceReport.items")}>
                {format.number(preview.items)}
              </PreviewRow>
              <PreviewRow label={t("insuranceReport.pieces")}>
                {format.number(preview.pieces)}
              </PreviewRow>
              {chosenColumns.map((column) => (
                <PreviewRow
                  key={column}
                  label={t(`insuranceReport.columns.${column}`)}
                  strong={column === "insuredValue"}
                >
                  {/* A column just ticked has no total until the new preview arrives. */}
                  {preview.totals[column] === undefined
                    ? "…"
                    : money(preview.totals[column], preview.currency)}
                </PreviewRow>
              ))}
            </dl>
            {preview.items === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("insuranceReport.nothingToReport")}
              </p>
            )}
            {columns.has("metalValue") && preview.spotPrices === null && (
              <p className="text-xs text-muted-foreground">
                {t("insuranceReport.noSpotPrices")}
              </p>
            )}
            {columns.has("metalValue") && preview.spotPrices?.stale && (
              <p className="text-xs text-muted-foreground">
                {t("insuranceReport.staleSpotPrices")}
              </p>
            )}
          </div>
        )}
      </Section>

      <Section
        title={t("insuranceReport.ownerTitle")}
        description={t("insuranceReport.ownerDescription")}
      >
        <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {(
            [
              [
                t("account.contact.fullName"),
                account.fullName ?? account.displayName,
              ],
              [t("auth.fields.email"), account.email],
              [t("account.contact.phone"), account.contactPhone],
              [t("account.contact.streetAddress"), address.join(", ")],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-xs leading-5 text-muted-foreground">
                {label}
              </dt>
              <dd className={cn(!value && "text-muted-foreground")}>
                {value || "–"}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {missingContact && t("insuranceReport.missingContact")}
          </p>
          <Button asChild variant="outline" size="xs">
            <Link href="/settings">{t("insuranceReport.editContact")}</Link>
          </Button>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {error && (
          <p role="alert" className="min-w-0 flex-1 text-xs text-destructive">
            {error}
          </p>
        )}
        <Button
          onClick={() => void download()}
          disabled={downloading || refreshing || !ready || ready.items === 0}
        >
          {downloading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {t("insuranceReport.download")}
        </Button>
      </div>
    </>
  );
}

function PreviewRow({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", strong && "font-semibold")}>
        {children}
      </dd>
    </div>
  );
}
