"use client";

import { useI18n } from "@/locales/client";
import type { Provenance } from "@coinslite/backend/convex/catalog/fields";
import { IconButton } from "@coinslite/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { Info } from "lucide-react";
import type * as React from "react";
import { useCatalogFormat } from "./use-catalog-format";

/** Who to credit for some facts, notes or an image, linked to the source when it has a link. */
export function CatalogCredit({ provenance }: { provenance: Provenance }) {
  const catalogFormat = useCatalogFormat();
  return (
    <SourceLink provenance={provenance}>
      {catalogFormat.credit(provenance)}
    </SourceLink>
  );
}

/**
 * The short credit for facts shown away from their Catalog entry, as on the
 * Item page: the source's name alone, linked, with the whole credit behind
 * an info button. Some sources' terms (the ECB's, the BNR's, the Open
 * Government Licence) ask for their credit wherever their facts appear, so
 * the whole of it stays one click away, also on phones.
 */
export function CatalogSourceCredit({
  provenance,
}: {
  provenance: Provenance;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const source = (
    <SourceLink provenance={provenance}>{provenance.source}</SourceLink>
  );
  const moreToCredit =
    provenance.licence !== undefined ||
    (provenance.author !== undefined &&
      provenance.author !== provenance.source);
  if (!moreToCredit) return source;
  return (
    <>
      {source}
      <Popover>
        <PopoverTrigger asChild>
          <IconButton
            type="button"
            label={t("catalog.sourceAndLicence")}
            className="-my-1 ml-0.5 size-6 align-middle [&_svg]:size-3.5"
          >
            <Info strokeWidth={1.75} />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3 text-xs leading-relaxed">
          {catalogFormat.credit(provenance)}
        </PopoverContent>
      </Popover>
    </>
  );
}

/** The source's link around `children`, or `children` alone when it has none. */
function SourceLink({
  provenance,
  children,
}: {
  provenance: Provenance;
  children: React.ReactNode;
}) {
  if (!provenance.link) return <>{children}</>;
  return (
    <a
      href={provenance.link}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
