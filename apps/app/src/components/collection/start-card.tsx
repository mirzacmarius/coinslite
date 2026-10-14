"use client";

import { catalogHref } from "@/components/catalog/catalog-levels";
import { IconTile } from "@/components/catalog/catalog-rows";
import { useCatalogVisible } from "@/components/catalog/use-catalog-visible";
import { useAddItem } from "@/components/items/add-item";
import { useI18n } from "@/locales/client";
import { ChevronRight, FileUp, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

/** A way that is one click: the whole row opens it. */
const wayRow =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted";

/** A way's name over a line on what it does. */
function WayText({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[13px] font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </span>
  );
}

const chevron = (
  <ChevronRight
    className="size-4 shrink-0 text-muted-foreground"
    strokeWidth={1.75}
    aria-hidden="true"
  />
);

/**
 * The ways into an empty Collection (spec 9), on the Overview and the
 * Collection page: add an Item (the dialog asks for its type), add a whole Set from the
 * Catalog (not while the Catalog is hidden), or import a spreadsheet. The
 * page holds the import dialog, so it stays open as the first rows fill the
 * Collection and this card gives way.
 */
export function StartCard({
  title,
  description,
  onImport,
}: {
  title: string;
  description: string;
  onImport: () => void;
}) {
  const t = useI18n();
  const titleId = useId();
  const catalogVisible = useCatalogVisible();
  const addItem = useAddItem();
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl bg-card"
    >
      <div className="flex flex-col gap-1 border-b px-4 py-3">
        <h2 id={titleId} className="text-sm font-medium">
          {title}
        </h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      <ul className="divide-y">
        <li>
          <button type="button" className={wayRow} onClick={() => addItem()}>
            <IconTile icon={Plus} />
            <WayText
              title={t("startCard.addItem")}
              description={t("startCard.addItemDescription")}
            />
            {chevron}
          </button>
        </li>
        {catalogVisible !== false && (
          <li>
            <Link href={catalogHref} className={wayRow}>
              <IconTile icon={ListChecks} />
              <WayText
                title={t("startCard.addSet")}
                description={t("startCard.addSetDescription")}
              />
              {chevron}
            </Link>
          </li>
        )}
        <li>
          <button type="button" className={wayRow} onClick={onImport}>
            <IconTile icon={FileUp} />
            <WayText
              title={t("startCard.import")}
              description={t("startCard.importDescription")}
            />
            {chevron}
          </button>
        </li>
      </ul>
    </section>
  );
}
