"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { useI18n } from "@/locales/client";
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
import type * as React from "react";
import { CatalogHeader, type Crumb } from "./catalog-header";
import { QuickAdd } from "./quick-add";
import { useCatalogFormat } from "./use-catalog-format";

type CatalogEntry = Extract<
  NonNullable<FunctionReturnType<typeof api.catalog.browse.node>>,
  { kind: "entry" }
>;

/** Where a Catalog entry's Numista cross-reference points (ADR 0003: a link, never stored data). */
const numistaHref = (id: number) =>
  `https://en.numista.com/catalogue/pieces${id}.html`;

/**
 * A Catalog entry: its picture and descriptive facts beside, and in the
 * properties panel how many the person holds, its metal and sizes, and where
 * its facts and notes come from.
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
  const format = useFormatters();
  const labels = useGradeLabels();
  const catalogFormat = useCatalogFormat();

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
  ]);
  const notes = filled([
    [t("catalog.historicalNotes"), entry.historicalNotes],
    [t("catalog.technicalDetails"), entry.technicalDetails],
  ]);
  const hasSources =
    entry.factsProvenance !== undefined ||
    entry.notesProvenance !== undefined ||
    entry.numistaId !== undefined;

  return (
    <>
      <CatalogHeader
        crumbs={crumbs}
        title={entry.title}
        actions={
          <>
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
          {notes.map(([title, text]) => (
            <section key={title} className="flex max-w-xl flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                {title}
              </h3>
              <p className="whitespace-pre-line text-sm">{text}</p>
            </section>
          ))}
        </div>
        <PropertyPanel>
          <PanelSection title={t("catalog.yourCollection")}>
            <PropertyRow label={t("catalog.held")}>
              {format.number(entry.held)}
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
              {entry.notesProvenance && (
                <PropertyRow label={t("catalog.notes")} wrap>
                  <Credit provenance={entry.notesProvenance} />
                </PropertyRow>
              )}
              {entry.numistaId !== undefined && (
                <PropertyRow label={t("catalog.numista")}>
                  <a
                    href={numistaHref(entry.numistaId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
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

/** The entry's picture with its credit, or a neutral placeholder until a licensed one is added. */
function EntryImage({ entry }: { entry: CatalogEntry }) {
  const t = useI18n();
  if (!entry.imageUrl) {
    const Icon = placeholderIcons[entry.itemType ?? "coin"];
    return (
      <div
        role="img"
        aria-label={t("catalog.noImage")}
        className="flex aspect-square w-full max-w-60 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
      >
        <Icon className="size-8" strokeWidth={1.25} aria-hidden="true" />
      </div>
    );
  }
  return (
    <figure className="flex w-full max-w-60 flex-col gap-1.5">
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
