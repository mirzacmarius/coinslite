"use client";

import { AlbumDot } from "@/components/albums/album-colours";
import { useAlbums } from "@/components/albums/use-albums";
import { catalogNodeHref } from "@/components/catalog/catalog-levels";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import { entryItemsHref } from "@/components/collection/collection-url";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { noMintMark } from "@coinslite/backend/convex/catalog/fields";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { EmptyState } from "@coinslite/ui/empty-state";
import { ActionLabel, HeaderBar } from "@coinslite/ui/header-bar";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { Copy, HandCoins, Pencil, SearchX, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type * as React from "react";
import { useId, useState } from "react";
import { isItemLimitError, useItemLimitMessage } from "../plans/plan-usage";
import { DeleteItemDialog } from "./delete-item-dialog";
import { useGradeLabels } from "./grade-labels";
import { ItemFormDialog } from "./item-form-dialog";
import { ItemPhotos } from "./item-photos";
import { MetalValue } from "./metal-value";
import { SellItemDialog } from "./sell-item-dialog";

/** One Item, every recorded fact: descriptive facts beside, the rest in the properties panel. */
export function ItemDetail() {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  const format = useFormatters();
  const labels = useGradeLabels();
  const catalogFormat = useCatalogFormat();
  const albums = useAlbums();
  const router = useRouter();
  // Each opening starts the form afresh from the Item as it is now.
  const [editing, setEditing] = useState({ open: false, key: 0 });
  const [duplicating, setDuplicating] = useState({ open: false, key: 0 });
  const [deleting, setDeleting] = useState(false);
  const [selling, setSelling] = useState({ open: false, key: 0 });
  const [takingBack, setTakingBack] = useState(false);
  const markOwned = useMutation(api.items.markOwned);
  const itemLimitMessage = useItemLimitMessage();
  // Once deleted, the Item reads as missing while the page goes back.
  const [leaving, setLeaving] = useState(false);
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
                className="text-[13px] font-medium text-link hover:underline"
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
          className="text-link hover:underline"
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
  const sold = item.soldOn !== undefined;
  const openSale = () =>
    setSelling(({ key }) => ({ open: true, key: key + 1 }));
  const takeBack = async () => {
    try {
      await markOwned({ itemId: item._id });
    } catch (failure) {
      toast.error(
        isItemLimitError(failure) ? itemLimitMessage : t("sale.ownedFailed"),
      );
      return;
    }
    toast.success(t("sale.owned"));
  };
  const filled = (rows: Array<[string, React.ReactNode]>) =>
    rows.filter(([, value]) => value !== undefined && value !== false);
  // Facts only the Catalog entry holds, read live from it, or the copy kept
  // when the entry left the Catalog.
  const details: Partial<NonNullable<typeof item.catalogEntry>["details"]> =
    item.catalogEntry?.details ?? item.catalogDetails ?? {};
  const fromCatalog: Array<[string, React.ReactNode]> = [
    [
      t("catalogFacts.mintMark"),
      details.noMintMark && catalogFormat.mintMark(noMintMark),
    ],
    [t("catalogFacts.mint"), details.mint],
    [
      t(
        details.designers && details.designers.length > 1
          ? "catalogFacts.designers"
          : "catalogFacts.designer",
      ),
      details.designers && catalogFormat.names(details.designers),
    ],
    [
      t("catalogFacts.issued"),
      details.issueDate && catalogFormat.partialDate(details.issueDate),
    ],
    [
      t("catalogFacts.withdrawn"),
      details.withdrawalDate &&
        catalogFormat.partialDate(details.withdrawalDate),
    ],
    [
      t("catalogFacts.composition"),
      details.composition && catalogFormat.composition(details.composition),
    ],
    [
      t("catalogFacts.edge"),
      details.edge && t(`catalogFacts.edges.${details.edge}`),
    ],
    [t("catalogFacts.edgeLettering"), details.edgeLettering],
    [
      t("catalogFacts.size"),
      details.width !== undefined &&
        details.height !== undefined &&
        catalogFormat.size(details.width, details.height),
    ],
  ];
  const shownFacts = filled(facts);
  const shownPhysical = filled(physical);
  const shownFromCatalog = filled(fromCatalog);
  return (
    <>
      <HeaderBar
        parent={parent}
        title={item.title}
        actions={
          <>
            {sold ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setTakingBack(true)}
              >
                <Undo2 aria-hidden="true" />
                <ActionLabel>{t("sale.markOwned")}</ActionLabel>
              </Button>
            ) : (
              <Button variant="ghost" size="xs" onClick={openSale}>
                <HandCoins aria-hidden="true" />
                <ActionLabel>{t("sale.sell")}</ActionLabel>
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                setDuplicating(({ key }) => ({ open: true, key: key + 1 }))
              }
            >
              <Copy aria-hidden="true" />
              <ActionLabel>{t("items.duplicate")}</ActionLabel>
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                setEditing(({ key }) => ({ open: true, key: key + 1 }))
              }
            >
              <Pencil aria-hidden="true" />
              <ActionLabel>{t("items.edit")}</ActionLabel>
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" />
              <ActionLabel>{t("deleteItem.delete")}</ActionLabel>
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
      <ItemFormDialog
        key={`copy-${duplicating.key}`}
        copyOf={item}
        open={duplicating.open}
        onOpenChange={(open) => setDuplicating(({ key }) => ({ open, key }))}
        onAdded={(copyId) => router.push(`/collection/${copyId}`)}
      />
      <SellItemDialog
        key={`sell-${selling.key}`}
        item={item}
        open={selling.open}
        onOpenChange={(open) => setSelling(({ key }) => ({ open, key }))}
      />
      <ConfirmDialog
        open={takingBack}
        onOpenChange={setTakingBack}
        title={t("sale.markOwnedTitle", { title: item.title })}
        description={t("sale.markOwnedBody")}
        confirmLabel={t("sale.markOwned")}
        cancelLabel={t("sale.cancel")}
        onConfirm={takeBack}
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
            {sold && <Badge variant="outline">{t("sale.soldBadge")}</Badge>}
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
          {item.soldOn !== undefined && (
            <PanelSection
              title={t("sale.section")}
              action={
                <Button variant="ghost" size="xs" onClick={openSale}>
                  {t("sale.edit")}
                </Button>
              }
            >
              <PropertyRow label={t("sale.soldOn")}>
                {format.date(item.soldOn)}
              </PropertyRow>
              <PropertyRow label={t("sale.salePrice")}>
                {money(item.salePrice)}
              </PropertyRow>
              {item.saleNote && (
                <PropertyRow label={t("sale.note")} wrap>
                  {item.saleNote}
                </PropertyRow>
              )}
            </PanelSection>
          )}
          <PanelSection title={t("items.details")}>
            <PropertyRow label={t("items.type")}>
              {t(`items.types.${item.type}`)}
            </PropertyRow>
            {item.catalogEntry && (
              <PropertyRow label={t("catalogPicker.entry")} wrap>
                <Link
                  href={catalogNodeHref(item.catalogEntry.key)}
                  className="hover:underline"
                >
                  {item.catalogEntry.title}
                </Link>
                {item.catalogEntry.otherItems > 0 && (
                  <>
                    {" "}
                    <Link
                      href={entryItemsHref(item.catalogEntry.key)}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {t("items.moreYouHold", {
                        count: format.number(item.catalogEntry.otherItems),
                      })}
                    </Link>
                  </>
                )}
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
          {shownFromCatalog.length > 0 && (
            <PanelSection title={t("items.fromCatalog")}>
              {shownFromCatalog.map(([label, value]) => (
                <PropertyRow key={label} label={label} wrap>
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
  action,
  children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1 p-4">
      {action ? (
        <div className="-my-1 mb-0 flex items-center justify-between gap-2">
          <h3
            id={titleId}
            className="text-xs font-medium text-muted-foreground"
          >
            {title}
          </h3>
          {action}
        </div>
      ) : (
        <h3
          id={titleId}
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {title}
        </h3>
      )}
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
