/**
 * Every level of the Catalog has its own URL. A node is `/catalog/<key>` (keys
 * are stable across deployments); a country's denomination path adds search
 * parameters: `?by=denomination` lists its denominations, `?denomination=…`
 * one denomination's series, and `&series=…` that series' entries. An empty
 * value stands for the group of entries without one.
 */

export const catalogHref = "/catalog";

/** A country or Theme, grouping or Catalog entry, in its default view. */
export const catalogNodeHref = (key: string) => `/catalog/${key}`;

/** What a country or grouping page shows. */
export type CatalogLevel =
  | { view: "groups" }
  | { view: "denominations" }
  | { view: "series"; denomination: string | null }
  | { view: "entries"; denomination: string | null; series: string | null };

const fromParam = (value: string) => value || null;
const toParam = (value: string | null) => value ?? "";

/**
 * The level a URL asks for. Only countries are browsed by denomination; they
 * start on their groupings when they have any, otherwise on denominations.
 */
export function levelFrom(
  params: URLSearchParams,
  node: { countryNode: boolean; groupings: unknown[] },
): CatalogLevel {
  if (!node.countryNode) return { view: "groups" };
  const denomination = params.get("denomination");
  const series = params.get("series");
  if (denomination !== null) {
    return series !== null
      ? {
          view: "entries",
          denomination: fromParam(denomination),
          series: fromParam(series),
        }
      : { view: "series", denomination: fromParam(denomination) };
  }
  const by = params.get("by");
  if (by === "group") return { view: "groups" };
  if (by === "denomination") return { view: "denominations" };
  return node.groupings.length > 0
    ? { view: "groups" }
    : { view: "denominations" };
}

/** The URL of a level of a node. */
export function levelHref(key: string, level: CatalogLevel) {
  const params = new URLSearchParams();
  if (level.view === "groups") params.set("by", "group");
  if (level.view === "denominations") params.set("by", "denomination");
  if (level.view === "series" || level.view === "entries")
    params.set("denomination", toParam(level.denomination));
  if (level.view === "entries") params.set("series", toParam(level.series));
  return `${catalogNodeHref(key)}?${params}`;
}
