"use client";

import { AlbumDot } from "@/components/albums/album-colours";
import { useAlbums } from "@/components/albums/use-albums";
import { catalogNodeHref } from "@/components/catalog/catalog-levels";
import {
  isItemLimitError,
  upgradeHref,
  useItemLimitMessage,
} from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { Copy, Pencil, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { DeleteItemDialog } from "./delete-item-dialog";
import { useGradeLabels } from "./grade-labels";
import { ItemFormDialog } from "./item-form-dialog";
import { ItemPhotos } from "./item-photos";
import { MetalValue } from "./metal-value";

/** One Item, every recorded fact: descriptive facts beside, the rest in the properties panel. */
export function ItemDetail() {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  const format = useFormatters();
  const labels = useGradeLabels();
  const albums = useAlbums();
  const router = useRouter();
  const duplicateItem = useMutation(api.items.duplicate);
  // Each opening starts the form afresh from the Item as it is now.
  const [editing, setEditing] = useState({ open: false, key: 0 });
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Once deleted, the Item reads as missing while the page goes back.
  const [leaving, setLeaving] = useState(false);
  const itemLimitMessage = useItemLimitMessage();
  const parent = (
    <Link href="/collection" className="hover:text-foreground">
      {t("nav.collection")}
    </Link>
  );

  if (item === undefined || (item === null && leaving)) {
    return <HeaderBar parent={parent} title="" />;
  }
  if (item === null) {
    return (
      <>
        <HeaderBar parent={parent} title={t("items.notFoundTitle")} />
        <div className="p-4">
          <EmptyState
            icon={
              <SearchX
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("items.notFoundTitle")}
            description={t("items.notFound")}
            action={
              <Link
                href="/collection"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("items.backToCollection")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const album = albums?.find(({ _id }) => _id === item.albumId);
  const money = (amount: number | undefined) =>
    amount === undefined ? undefined : format.money(amount, item.currency);
  const millimetres = (value: number | undefined) =>
    value === undefined
      ? undefined
      : `${format.number(value)} ${t("items.millimetres")}`;
  const facts: Array<[string, React.ReactNode]> = [
    [t("items.country"), item.country && format.country(item.country)],
    [t("items.year"), item.year],
    [t("items.denomination"), item.denomination],
    [t("items.series"), item.series],
    [t("items.category"), item.category],
    [t("items.ruler"), item.ruler],
    [t("items.mintMark"), item.mintMark],
    [
      t("items.mintage"),
      item.mintage === undefined ? undefined : format.number(item.mintage),
    ],
    [
      t("items.numistaNumber"),
      item.numistaNumber !== undefined && (
        <a
          href={`https://en.numista.com/catalogue/pieces${item.numistaNumber}.html`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          N# {item.numistaNumber}
        </a>
      ),
    ],
  ];
  const physical: Array<[string, React.ReactNode]> = [
    [
      t("items.material"),
      [
        item.material && t(`items.materials.${item.material}`),
        item.materialNote,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    ],
    [t("items.diameter"), millimetres(item.diameter)],
    [t("items.thickness"), millimetres(item.thickness)],
  ];
  const filled = (rows: Array<[string, React.ReactNode]>) =>
    rows.filter(([, value]) => value !== undefined && value !== false);
  const shownFacts = filled(facts);
  const shownPhysical = filled(physical);
  const duplicate = async () => {
    setDuplicating(true);
    try {
      const copyId = await duplicateItem({ itemId: item._id });
      toast.success(t("items.duplicated"));
      router.push(`/collection/${copyId}`);
    } catch (failure) {
      if (isItemLimitError(failure)) {
        toast.error(itemLimitMessage, {
          action: {
            label: t("plans.upgradeToPremium"),
            onClick: () => router.push(upgradeHref),
          },
        });
      } else {
        toast.error(t("items.errors.duplicateFailed"));
      }
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <HeaderBar
        parent={parent}
        title={item.title}
        actions={
          <>
            <Button
              variant="ghost"
              size="xs"
              disabled={duplicating}
              onClick={() => void duplicate()}
            >
              <Copy aria-hidden="true" />
              {t("items.duplicate")}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                setEditing(({ key }) => ({ open: true, key: key + 1 }))
              }
            >
              <Pencil aria-hidden="true" />
              {t("items.edit")}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" />
              {t("deleteItem.delete")}
            </Button>
          </>
        }
      />
      <ItemFormDialog
        key={editing.key}
        item={item}
        open={editing.open}
        onOpenChange={(open) => setEditing(({ key }) => ({ open, key }))}
      />
      <DeleteItemDialog
        item={item}
        open={deleting}
        onOpenChange={setDeleting}
        onLeaving={setLeaving}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4">
          <ItemPhotos item={item} />
          <div className="flex items-center gap-3">
            <ItemTypeIcon type={item.type} />
            <h2 className="text-base font-medium">{item.title}</h2>
          </div>
          {shownFacts.length > 0 && (
            <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {shownFacts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.notes && (
            <section className="flex max-w-xl flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("items.notes")}
              </h3>
              <p className="whitespace-pre-line text-sm">{item.notes}</p>
            </section>
          )}
        </div>
        <aside className="flex w-full shrink-0 flex-col divide-y border-t bg-card lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[300px]">
          <PanelSection title={t("items.details")}>
            <PropertyRow label={t("items.type")}>
              {t(`items.types.${item.type}`)}
            </PropertyRow>
            {item.catalogEntry && (
              <PropertyRow label={t("catalogPicker.entry")}>
                <Link
                  href={catalogNodeHref(item.catalogEntry.key)}
                  className="hover:underline"
                >
                  {item.catalogEntry.title}
                </Link>
              </PropertyRow>
            )}
            <PropertyRow label={t("albums.album")}>
              {album && (
                <Link
                  href={`/albums/${album._id}`}
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                >
                  <AlbumDot colour={album.colour} />
                  <span className="truncate">{album.name}</span>
                </Link>
              )}
            </PropertyRow>
            <PropertyRow label={t("items.grade")}>
              {item.grade && item.gradingScale && (
                <>
                  {labels.grade(item.gradingScale, item.grade, item.strike)}
                  {labels.meaning(item.gradingScale, item.grade) && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {labels.meaning(item.gradingScale, item.grade)}
                    </span>
                  )}
                </>
              )}
            </PropertyRow>
            {item.gradingScale && (
              <PropertyRow label={t("items.gradingScale")}>
                {labels.scale(item.gradingScale)}
              </PropertyRow>
            )}
            {item.gradeNote && (
              <PropertyRow label={t("items.gradeNote")} wrap>
                {item.gradeNote}
              </PropertyRow>
            )}
            {item.type !== "stamp" && (
              <PropertyRow label={t("items.strike")}>
                {item.strike && labels.strike(item.strike)}
              </PropertyRow>
            )}
            <PropertyRow label={t("items.quantity")}>
              {format.number(item.quantity)}
            </PropertyRow>
          </PanelSection>
          {shownPhysical.length > 0 && (
            <PanelSection title={t("items.physical")}>
              {shownPhysical.map(([label, value]) => (
                <PropertyRow key={label} label={label}>
                  {value}
                </PropertyRow>
              ))}
            </PanelSection>
          )}
          {item.type === "coin" && (item.metal || item.bullion) && (
            <PanelSection title={t("preciousMetal.title")}>
              <PropertyRow label={t("preciousMetal.metal")}>
                {item.metal && t(`items.materials.${item.metal}`)}
              </PropertyRow>
              <PropertyRow label={t("preciousMetal.weight")}>
                {item.weight !== undefined &&
                  `${format.number(item.weight)} ${t("preciousMetal.grams")}`}
              </PropertyRow>
              <PropertyRow label={t("preciousMetal.purity")}>
                {item.purity !== undefined &&
                  format.number(item.purity, { maximumFractionDigits: 5 })}
              </PropertyRow>
              <PropertyRow label={t("preciousMetal.bullion")}>
                {t(item.bullion ? "preciousMetal.yes" : "preciousMetal.no")}
              </PropertyRow>
              {item.metal && (
                <PropertyRow label={t("preciousMetal.metalValue")} wrap>
                  <MetalValue item={item} />
                </PropertyRow>
              )}
            </PanelSection>
          )}
          <PanelSection title={t("items.purchase")}>
            <PropertyRow label={t("items.purchasePrice")}>
              {money(item.purchasePrice)}
            </PropertyRow>
            <PropertyRow label={t("items.marketValue")}>
              {money(item.marketValue)}
            </PropertyRow>
            <PropertyRow label={t("items.purchaseDate")}>
              {item.purchaseDate && format.date(item.purchaseDate)}
            </PropertyRow>
            <PropertyRow label={t("items.source")}>{item.source}</PropertyRow>
          </PanelSection>
        </aside>
      </div>
    </>
  );
}

function PanelSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 p-4">
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A label and its value; a missing value shows as a dash. Long text can `wrap`. */
function PropertyRow({
  label,
  wrap = false,
  children,
}: { label: string; wrap?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid min-h-7 grid-cols-[112px_1fr] gap-2",
        wrap ? "items-start py-1" : "items-center",
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 text-[13px]",
          wrap ? "whitespace-pre-line break-words" : "truncate",
        )}
      >
        {children || "–"}
      </span>
    </div>
  );
}
