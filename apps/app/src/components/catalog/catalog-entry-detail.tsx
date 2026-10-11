"use client";

import { entryItemsHref } from "@/components/collection/collection-url";
import { useGradeLabels } from "@/components/items/grade-labels";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { api } from "@coinslite/backend/convex/_generated/api";
import type { Provenance } from "@coinslite/backend/convex/catalog/fields";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import {
  PanelSection,
  PropertyPanel,
  PropertyRow,
} from "@coinslite/ui/property-panel";
import type { FunctionReturnType } from "convex/server";
import { Banknote, Coins } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { CatalogEntryEdit } from "./catalog-entry-edit";
import { CatalogHeader, type Crumb } from "./catalog-header";
import { CatalogImageAdmin } from "./catalog-image-admin";
import { QuickAdd } from "./quick-add";
import { useCatalogFormat } from "./use-catalog-format";

type CatalogEntry = Extract<
  NonNullable<FunctionReturnType<typeof api.catalog.browse.node>>,
  { kind: "entry" }
>;

/** Where a Catalog entry's Numista cross-reference points (ADR 0003: a link, never stored data). */
const numistaHref = (id: number) =>
  `https://en.numista.com/catalogue/pieces${id}.html`;

type Note = NonNullable<NonNullable<CatalogEntry["notes"]>["technical"]>;

/**
 * A Catalog entry: its picture and descriptive facts beside, and in the
 * properties panel how many the person holds, its metal and sizes, and where
 * its facts and notes come from. Notes read in the reader's language where
 * they're translated, otherwise in their source's language, marked as such.
 */
export function CatalogEntryDetail({
  entry,
  crumbs,
  actions,
}: {
  entry: CatalogEntry;
  crumbs: Crumb[];
  actions?: React.ReactNode;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const labels = useGradeLabels();
  const catalogFormat = useCatalogFormat();
  const banknote = entry.itemType === "banknote";

  const filled = (rows: Array<[string, React.ReactNode]>) =>
    rows.filter(([, value]) => value !== undefined && value !== false);
  const facts = filled([
    [t("items.country"), entry.country && format.country(entry.country)],
    [t("items.denomination"), entry.denomination],
    [t("catalog.years"), catalogFormat.years(entry.yearFrom, entry.yearTo)],
    [t("items.series"), entry.series],
    [t("items.strike"), entry.strike && labels.strike(entry.strike)],
    [
      t("items.material"),
      entry.material && t(`items.materials.${entry.material}`),
    ],
    [
      t(
        entry.designers && entry.designers.length > 1
          ? "catalogFacts.designers"
          : "catalogFacts.designer",
      ),
      entry.designers && catalogFormat.names(entry.designers),
    ],
    [t("catalogFacts.mint"), entry.mint],
    [
      t("catalogFacts.mintMark"),
      entry.mintMark && catalogFormat.mintMark(entry.mintMark),
    ],
    [
      t("catalogFacts.issued"),
      entry.issueDate && catalogFormat.partialDate(entry.issueDate),
    ],
    [
      t("catalogFacts.withdrawn"),
      entry.withdrawalDate && catalogFormat.partialDate(entry.withdrawalDate),
    ],
    [
      t(banknote ? "catalogFacts.numberIssued" : "catalogFacts.mintage"),
      entry.mintage !== undefined && format.number(entry.mintage),
    ],
  ]);
  const physical = filled([
    [
      t("preciousMetal.metal"),
      entry.metal && t(`items.materials.${entry.metal}`),
    ],
    [
      t("preciousMetal.weight"),
      entry.weight !== undefined && catalogFormat.weight(entry.weight),
    ],
    [
      t("catalog.fineness"),
      entry.fineness !== undefined && catalogFormat.fineness(entry.fineness),
    ],
    [
      t("items.diameter"),
      entry.diameter !== undefined && catalogFormat.millimetres(entry.diameter),
    ],
    [
      t("catalogFacts.thickness"),
      entry.thickness !== undefined &&
        catalogFormat.millimetres(entry.thickness),
    ],
    [
      t("catalogFacts.size"),
      entry.width !== undefined &&
        entry.height !== undefined &&
        catalogFormat.size(entry.width, entry.height),
    ],
    [
      t("catalogFacts.composition"),
      entry.composition && catalogFormat.composition(entry.composition),
    ],
    [
      t("catalogFacts.edge"),
      entry.edge && t(`catalogFacts.edges.${entry.edge}`),
    ],
    [t("catalogFacts.edgeLettering"), entry.edgeLettering],
  ]);
  const notes = (
    [
      [t("catalog.historicalNotes"), entry.notes?.historical],
      [t("catalog.technicalDetails"), entry.notes?.technical],
    ] as Array<[string, Note | undefined]>
  ).filter((pair): pair is [string, Note] => pair[1] !== undefined);
  // One credit for notes that share their source, one each when they don't.
  const sharedCredit =
    notes.length > 0 &&
    notes.every(
      ([, note]) =>
        JSON.stringify(note.provenance) ===
        JSON.stringify(notes[0]?.[1].provenance),
    );
  const notesCredits = (
    sharedCredit
      ? [[t("catalog.notes"), notes[0]?.[1].provenance]]
      : notes.map(([title, note]) => [title, note.provenance])
  ).filter((pair): pair is [string, Provenance] => pair[1] !== undefined);
  const hasSources =
    entry.factsProvenance !== undefined ||
    notesCredits.length > 0 ||
    entry.numistaId !== undefined;

  return (
    <>
      <CatalogHeader
        crumbs={crumbs}
        title={entry.title}
        actions={
          <>
            <CatalogEntryEdit entryKey={entry.key} />
            <QuickAdd entry={entry} />
            {actions}
          </>
        }
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4">
          <EntryImage entry={entry} />
          <div className="flex items-center gap-3">
            <ItemTypeIcon type={entry.itemType ?? "coin"} />
            <h2 className="text-base font-medium">{entry.title}</h2>
          </div>
          {facts.length > 0 && (
            <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {notes.map(([title, note]) => {
            const elsewhere = note.language !== locale;
            return (
              <section key={title} className="flex max-w-xl flex-col gap-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  {title}
                  {elsewhere && (
                    <span className="font-normal">
                      {" · "}
                      {t("catalogFacts.inLanguage", {
                        language: catalogFormat.languageName(note.language),
                      })}
                    </span>
                  )}
                </h3>
                <p
                  lang={elsewhere ? note.language : undefined}
                  className="whitespace-pre-line text-sm"
                >
                  {note.text}
                </p>
              </section>
            );
          })}
        </div>
        <PropertyPanel>
          <PanelSection title={t("catalog.yourCollection")}>
            <PropertyRow label={t("catalog.held")}>
              {/* A count of zero has nothing to open. */}
              {entry.held > 0 ? (
                <Link
                  href={entryItemsHref(entry.key)}
                  className="text-link hover:underline"
                >
                  {format.number(entry.held)}
                  {entry.heldMore && "+"}
                </Link>
              ) : (
                format.number(entry.held)
              )}
            </PropertyRow>
          </PanelSection>
          {physical.length > 0 && (
            <PanelSection title={t("items.physical")}>
              {physical.map(([label, value]) => (
                <PropertyRow key={label} label={label}>
                  {value}
                </PropertyRow>
              ))}
            </PanelSection>
          )}
          {hasSources && (
            <PanelSection title={t("catalog.sources")}>
              {entry.factsProvenance && (
                <PropertyRow label={t("catalog.facts")} wrap>
                  <Credit provenance={entry.factsProvenance} />
                </PropertyRow>
              )}
              {notesCredits.map(([label, provenance]) => (
                <PropertyRow key={label} label={label} wrap>
                  <Credit provenance={provenance} />
                </PropertyRow>
              ))}
              {entry.numistaId !== undefined && (
                <PropertyRow label={t("catalog.numista")}>
                  <a
                    href={numistaHref(entry.numistaId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link hover:underline"
                  >
                    {t("catalog.numistaLink", { id: entry.numistaId })}
                  </a>
                </PropertyRow>
              )}
            </PanelSection>
          )}
        </PropertyPanel>
      </div>
    </>
  );
}

/** Who to credit for some facts, notes or an image, linked to the source when it has a link. */
function Credit({ provenance }: { provenance: Provenance }) {
  const catalogFormat = useCatalogFormat();
  const text = catalogFormat.credit(provenance);
  if (!provenance.link) return <>{text}</>;
  return (
    <a
      href={provenance.link}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-2 hover:underline"
    >
      {text}
    </a>
  );
}

const placeholderIcons = { coin: Coins, banknote: Banknote } as const;

/**
 * The entry's picture with its credit, or a neutral placeholder until a
 * licensed one is added; below it, admins' actions on the image.
 */
function EntryImage({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="flex w-full max-w-60 flex-col gap-1.5">
      <EntryPicture entry={entry} />
      <CatalogImageAdmin entry={entry} />
    </div>
  );
}

function EntryPicture({ entry }: { entry: CatalogEntry }) {
  const t = useI18n();
  if (!entry.imageUrl) {
    const Icon = placeholderIcons[entry.itemType ?? "coin"];
    return (
      <div
        role="img"
        aria-label={t("catalog.noImage")}
        className="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted text-muted-foreground"
      >
        <Icon className="size-8" strokeWidth={1.25} aria-hidden="true" />
      </div>
    );
  }
  return (
    <figure className="flex w-full flex-col gap-1.5">
      <img
        src={entry.imageUrl}
        alt={entry.title}
        referrerPolicy="no-referrer"
        className="aspect-square w-full rounded-lg border bg-muted object-contain"
      />
      {entry.imageProvenance && (
        <figcaption className="text-xs text-muted-foreground">
          {t("catalog.imageCredit")}
          {" · "}
          <Credit provenance={entry.imageProvenance} />
        </figcaption>
      )}
    </figure>
  );
}
