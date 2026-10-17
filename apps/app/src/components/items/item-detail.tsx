"use client";

import { useMoney } from "@/components/account/home-currency-change";
import { AlbumDot } from "@/components/albums/album-colours";
import { useAlbums } from "@/components/albums/use-albums";
import { CatalogSourceCredit } from "@/components/catalog/catalog-credit";
import { catalogNodeHref, setHref } from "@/components/catalog/catalog-levels";
import { useCatalogFormat } from "@/components/catalog/use-catalog-format";
import {
  collectionHref,
  entryItemsHref,
  itemPageHref,
  viewOfItemUrl,
} from "@/components/collection/collection-url";
import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { noMintMark } from "@coinslite/backend/convex/catalog/fields";
import {
  certificateUrl,
  graderNames,
  referenceName,
  stampCatalogueNames,
} from "@coinslite/backend/convex/items/references";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { EmptyState } from "@coinslite/ui/empty-state";
import { ActionLabel, HeaderBar } from "@coinslite/ui/header-bar";
import { Kbd } from "@coinslite/ui/kbd";
import { toast } from "@coinslite/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  Copy,
  HandCoins,
  ListChecks,
  Pencil,
  SearchX,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useId, useMemo, useState } from "react";
import { isItemLimitError, useItemLimitMessage } from "../plans/plan-usage";
import { CatalogSuggestion } from "./catalog-suggestion";
import { DeleteItemDialog } from "./delete-item-dialog";
import { useGradeLabels } from "./grade-labels";
import { ItemFormDialog } from "./item-form-dialog";
import {
  ItemHeader,
  ItemHeaderSkeleton,
  type ItemMoney,
  ItemTag,
} from "./item-header";
import { ItemNeighbours } from "./item-neighbours";
import { ItemPhotos } from "./item-photos";
import { MetalValue } from "./metal-value";
import { SellItemDialog } from "./sell-item-dialog";

/**
 * One Item, every recorded fact: its photos first, beside its title, Grade,
 * Album and figures (value, Gain/loss, what was paid, Metal value) and notes;
 * then the rest in titled cards that flow down two columns where there's room.
 */
export function ItemDetail() {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  // The Collection view the Item was opened from, if any.
  const params = useSearchParams();
  const view = useMemo(
    () => viewOfItemUrl(new URLSearchParams(params.toString())),
    [params],
  );
  const format = useFormatters();
  const formatMoney = useMoney();
  const labels = useGradeLabels();
  const catalogFormat = useCatalogFormat();
  const albums = useAlbums();
  const router = useRouter();
  // The Item's edit page, which comes back to this view of the Collection.
  const editHref = itemPageHref(itemId, params.toString(), true);
  // Each opening starts the form afresh from the Item as it is now.
  const [duplicating, setDuplicating] = useState({ open: false, key: 0 });
  const [deleting, setDeleting] = useState(false);
  const [selling, setSelling] = useState({ open: false, key: 0 });
  const [takingBack, setTakingBack] = useState(false);
  const markOwned = useMutation(api.items.markOwned);
  const itemLimitMessage = useItemLimitMessage();
  // Once deleted, the Item reads as missing while the page goes back.
  const [leaving, setLeaving] = useState(false);
  const notesId = useId();
  useShortcut("e", () => router.push(editHref), Boolean(item));
  const parent = (
    <Link
      href={view ? collectionHref(view) : "/collection"}
      className="hover:text-foreground"
    >
      {t("nav.collection")}
    </Link>
  );

  if (item === undefined || (item === null && leaving)) {
    return <ItemDetailSkeleton parent={parent} />;
  }
  if (item === null) return <ItemNotFound parent={parent} />;

  const album = albums?.find(({ _id }) => _id === item.albumId);
  // "Converting to …" while a Home currency change converts the amounts.
  const money: ItemMoney = (amount, options) =>
    amount === undefined
      ? undefined
      : formatMoney(amount, item.currency, options);
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
          <span translate="no">N# {item.numistaNumber}</span>
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
  // The Certification, as its label reads ("PCGS 12345678"), linked to the
  // grader's verification page where there is one.
  const otherReference = t("items.otherReference");
  const grader =
    item.grader &&
    referenceName(graderNames, item.grader, item.graderName, otherReference);
  const verifyHref =
    item.grader &&
    item.certificateNumber &&
    certificateUrl(
      item.grader,
      item.certificateNumber,
      item.grade && item.gradingScale
        ? { scale: item.gradingScale, grade: item.grade }
        : undefined,
    );
  const verifyLink = (text: string) =>
    verifyHref ? (
      <a
        href={verifyHref}
        target="_blank"
        rel="noreferrer"
        className="text-link hover:underline"
      >
        {text}
      </a>
    ) : (
      text
    );
  // Grading services' and catalogues' own codes, kept as they're written.
  const code = (text: string | undefined) =>
    text && <span translate="no">{text}</span>;
  const certification: Array<[string, React.ReactNode]> = [
    [t("items.grader"), grader],
    [
      t("items.certificateNumber"),
      item.certificateNumber && verifyLink(item.certificateNumber),
    ],
  ];
  const gradeLabel =
    item.grade &&
    item.gradingScale &&
    labels.grade(item.gradingScale, item.grade, item.strike);
  const gradeMeaning =
    item.grade &&
    item.gradingScale &&
    labels.meaning(item.gradingScale, item.grade);
  const references: Array<[string, React.ReactNode]> = [
    [
      t("items.stampCatalogue"),
      item.stampCatalogue &&
        referenceName(
          stampCatalogueNames,
          item.stampCatalogue,
          item.stampCatalogueName,
          otherReference,
        ),
    ],
    [t("items.stampCatalogueNumber"), code(item.stampCatalogueNumber)],
    [t("items.perforation"), item.perforation],
    [t("items.watermark"), item.watermark],
    [t("items.colour"), item.colour],
    [t("items.serialNumber"), code(item.serialNumber)],
    [t("items.signatures"), item.signatures],
    [t("items.printer"), item.printer],
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
  const shownReferences = filled(references);
  const shownCertification = filled(certification);
  // The Grade section shows once anything about the Item's condition is set.
  const graded = Boolean(
    gradeLabel || item.strike || item.gradeNote || shownCertification.length,
  );
  // Whose facts the Item shows from its entry, credited as the entry page does.
  const factsCredit = item.catalogEntry?.factsCredit;
  // What sums the Item up under its title: its Grade, Certification and Album.
  const tags = [
    gradeLabel && (
      <ItemTag
        key="grade"
        icon={<Award strokeWidth={1.75} aria-hidden="true" />}
      >
        {gradeLabel}
        {gradeMeaning && (
          <span className="text-muted-foreground"> · {gradeMeaning}</span>
        )}
      </ItemTag>
    ),
    item.certificateNumber && (
      <ItemTag
        key="certificate"
        icon={<ShieldCheck strokeWidth={1.75} aria-hidden="true" />}
        href={verifyHref || undefined}
        external
      >
        <span translate="no">
          {[grader, item.certificateNumber].filter(Boolean).join(" ")}
        </span>
      </ItemTag>
    ),
    album && (
      <ItemTag
        key="album"
        icon={<AlbumDot colour={album.colour} />}
        href={`/albums/${album._id}`}
      >
        {album.name}
      </ItemTag>
    ),
  ].filter(Boolean);
  return (
    <>
      <HeaderBar
        parent={parent}
        title={item.title}
        actions={
          <>
            {view && <ItemNeighbours itemId={item._id} view={view} />}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="xs" asChild>
                  <Link href={editHref} aria-keyshortcuts="E">
                    <Pencil aria-hidden="true" />
                    <ActionLabel>{t("items.edit")}</ActionLabel>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                {t("items.edit")}
                <Kbd className="border-background/20 bg-background/10 text-background">
                  E
                </Kbd>
              </TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="xs" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" />
              <ActionLabel>{t("deleteItem.delete")}</ActionLabel>
            </Button>
          </>
        }
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        {!item.catalogEntryId && item.type !== "stamp" && (
          <CatalogSuggestion itemId={item._id} />
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-8">
          <ItemPhotos item={item} />
          <ItemHeader
            item={item}
            money={money}
            tags={
              tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">{tags}</ul>
              )
            }
          >
            {item.notes && (
              <section
                aria-labelledby={notesId}
                className="flex flex-col gap-1"
              >
                <h2
                  id={notesId}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("items.notes")}
                </h2>
                <p className="whitespace-pre-line break-words text-sm">
                  {item.notes}
                </p>
              </section>
            )}
          </ItemHeader>
        </div>
        <div className="gap-x-4 [columns:18rem_2]">
          {item.soldOn !== undefined && (
            <FactSection
              title={t("sale.section")}
              action={
                <Button variant="ghost" size="xs" onClick={openSale}>
                  {t("sale.edit")}
                </Button>
              }
            >
              <Fact label={t("sale.soldOn")}>{format.date(item.soldOn)}</Fact>
              <Fact label={t("sale.salePrice")}>{money(item.salePrice)}</Fact>
              {item.saleNote && (
                <Fact label={t("sale.note")}>{item.saleNote}</Fact>
              )}
            </FactSection>
          )}
          <FactSection title={t("items.details")}>
            <Fact label={t("items.type")}>{t(`items.types.${item.type}`)}</Fact>
            {shownFacts.map(([label, value]) => (
              <Fact key={label} label={label}>
                {value}
              </Fact>
            ))}
            {item.catalogEntry && (
              <Fact label={t("catalogPicker.entry")}>
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
              </Fact>
            )}
            {item.catalogEntry?.set && (
              <Fact label={t("sets.title")}>
                <Link
                  href={setHref(item.catalogEntry.set)}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <ListChecks
                    className="size-3.5 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {t("sets.viewAsSet")}
                </Link>
              </Fact>
            )}
            <Fact label={t("albums.album")}>
              {album && (
                <Link
                  href={`/albums/${album._id}`}
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                >
                  <AlbumDot colour={album.colour} />
                  <span className="truncate">{album.name}</span>
                </Link>
              )}
            </Fact>
            <Fact label={t("items.quantity")}>
              {format.number(item.quantity)}
            </Fact>
          </FactSection>
          {graded && (
            <FactSection title={t("items.grade")}>
              <Fact label={t("items.grade")}>
                {gradeLabel && (
                  <>
                    {gradeLabel}
                    {gradeMeaning && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {gradeMeaning}
                      </span>
                    )}
                  </>
                )}
              </Fact>
              {item.gradingScale && (
                <Fact label={t("items.gradingScale")}>
                  {labels.scale(item.gradingScale)}
                </Fact>
              )}
              {item.type !== "stamp" && (
                <Fact label={t("items.strike")}>
                  {item.strike && labels.strike(item.strike)}
                </Fact>
              )}
              {item.gradeNote && (
                <Fact label={t("items.gradeNote")}>{item.gradeNote}</Fact>
              )}
              {shownCertification.map(([label, value]) => (
                <Fact key={label} label={label}>
                  {value}
                </Fact>
              ))}
            </FactSection>
          )}
          <FactSection title={t("items.purchase")}>
            <Fact label={t("items.purchasePrice")}>
              {money(item.purchasePrice)}
            </Fact>
            <Fact label={t("items.marketValue")}>
              {money(item.marketValue)}
            </Fact>
            <Fact label={t("items.purchaseDate")}>
              {item.purchaseDate && format.date(item.purchaseDate)}
            </Fact>
            <Fact label={t("items.source")}>{item.source}</Fact>
          </FactSection>
          {item.type === "coin" && (item.metal || item.bullion) && (
            <FactSection title={t("preciousMetal.title")}>
              <Fact label={t("preciousMetal.metal")}>
                {item.metal && t(`items.materials.${item.metal}`)}
              </Fact>
              <Fact label={t("preciousMetal.weight")}>
                {item.weight !== undefined &&
                  `${format.number(item.weight)} ${t("preciousMetal.grams")}`}
              </Fact>
              <Fact label={t("preciousMetal.purity")}>
                {item.purity !== undefined &&
                  format.number(item.purity, { maximumFractionDigits: 5 })}
              </Fact>
              <Fact label={t("preciousMetal.bullion")}>
                {t(item.bullion ? "preciousMetal.yes" : "preciousMetal.no")}
              </Fact>
              {/* An owned Item's is among the figures at the top. */}
              {item.metal && sold && (
                <Fact label={t("preciousMetal.metalValue")}>
                  <MetalValue item={item} />
                </Fact>
              )}
            </FactSection>
          )}
          {shownPhysical.length > 0 && (
            <FactSection title={t("items.physical")}>
              {shownPhysical.map(([label, value]) => (
                <Fact key={label} label={label}>
                  {value}
                </Fact>
              ))}
            </FactSection>
          )}
          {shownReferences.length > 0 && (
            <FactSection title={t("items.references")}>
              {shownReferences.map(([label, value]) => (
                <Fact key={label} label={label}>
                  {value}
                </Fact>
              ))}
            </FactSection>
          )}
          {(shownFromCatalog.length > 0 || factsCredit) && (
            <FactSection title={t("items.fromCatalog")}>
              {shownFromCatalog.map(([label, value]) => (
                <Fact key={label} label={label}>
                  {value}
                </Fact>
              ))}
              {factsCredit && (
                <Fact label={t("items.factsSource")}>
                  <CatalogSourceCredit provenance={factsCredit} />
                </Fact>
              )}
            </FactSection>
          )}
        </div>
      </div>
    </>
  );
}

/** An Item that doesn't exist, or isn't the person's, with the way back to the Collection. */
export function ItemNotFound({ parent }: { parent: React.ReactNode }) {
  const t = useI18n();
  return (
    <>
      <HeaderBar parent={parent} title={t("items.notFoundTitle")} />
      <div className="p-4">
        <EmptyState
          icon={
            <SearchX className="size-4" strokeWidth={1.75} aria-hidden="true" />
          }
          title={t("items.notFoundTitle")}
          description={t("items.notFound")}
          action={
            <Link
              href="/collection"
              className="text-ui font-medium text-link hover:underline"
            >
              {t("items.backToCollection")}
            </Link>
          }
        />
      </div>
    </>
  );
}

/**
 * The Item page while the Item loads (and once it's deleted, while the page
 * goes back): its bar, photos, header and fact sections as placeholders.
 */
export function ItemDetailSkeleton({ parent }: { parent?: React.ReactNode }) {
  const t = useI18n();
  const placeholder = (size: string) => (
    <span className={cn("block animate-pulse rounded bg-muted", size)} />
  );
  return (
    <>
      <HeaderBar
        parent={
          parent ?? (
            <Link href="/collection" className="hover:text-foreground">
              {t("nav.collection")}
            </Link>
          )
        }
        title={
          <>
            <span className="sr-only">{t("items.loading")}</span>
            <span
              className="inline-block h-3.5 w-40 animate-pulse rounded bg-muted align-middle"
              aria-hidden="true"
            />
          </>
        }
      />
      <div
        aria-busy="true"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-8">
          <div
            className="grid grid-cols-2 gap-3 rounded-xl bg-card p-3 sm:gap-4 sm:p-4"
            aria-hidden="true"
          >
            {placeholder("aspect-square rounded-lg")}
            {placeholder("aspect-square rounded-lg")}
          </div>
          <ItemHeaderSkeleton />
        </div>
        <div className="gap-x-4 [columns:18rem_2]" aria-hidden="true">
          {[
            [0, 1, 2, 3],
            [0, 1, 2],
          ].map((rows) => (
            <div
              key={rows.length}
              className="mb-4 flex break-inside-avoid flex-col gap-3 rounded-xl bg-card p-4"
            >
              {placeholder("h-4 w-24")}
              {rows.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[min(9rem,40%)_minmax(0,1fr)] gap-4"
                >
                  {placeholder("h-3.5 w-20")}
                  {placeholder("h-3.5 w-28")}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * One titled card of the Item's facts. The cards flow down two columns where
 * there's room, each kept whole.
 */
function FactSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="mb-4 break-inside-avoid rounded-xl bg-card px-4 pb-1 pt-3"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 id={titleId} className="text-ui font-medium">
          {title}
        </h2>
        {action}
      </div>
      <dl className="mt-1 divide-y">{children}</dl>
    </section>
  );
}

/** A fact's label and value; a missing value shows as a dash. Long values wrap. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const missing =
    children === undefined ||
    children === null ||
    children === false ||
    children === "";
  return (
    <div className="grid grid-cols-[min(9rem,40%)_minmax(0,1fr)] gap-x-4 py-2">
      <dt className="break-words text-ui text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 whitespace-pre-line break-words text-ui",
          missing && "text-muted-foreground",
        )}
      >
        {missing ? "–" : children}
      </dd>
    </div>
  );
}
