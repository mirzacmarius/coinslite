"use client";

import type { Provenance } from "@coinslite/backend/convex/catalog/fields";
import { useCatalogFormat } from "./use-catalog-format";

/** Who to credit for some facts, notes or an image, linked to the source when it has a link. */
export function CatalogCredit({ provenance }: { provenance: Provenance }) {
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
