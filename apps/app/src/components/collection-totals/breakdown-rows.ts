import {
  type GroupTotal,
  notRecorded,
} from "@coinslite/backend/convex/items/totals";

/** How many groups a breakdown lists before the rest fold into one "Other" row. */
export const shownGroups = 6;

/** The key of the row that stands for the groups past `shownGroups`. */
export const otherGroups = "*";

export type BreakdownRow = GroupTotal & {
  /** The row's share of the largest row, 0 to 1, for its bar. */
  share: number;
  /** For the "Other" row: how many groups it stands for. */
  others?: number;
};

/**
 * The rows a breakdown shows, from the server's groups (largest Market value
 * first, the Items without the fact last): the first `limit` groups, then the
 * rest as one "Other" row (a lone leftover stays itself), then the Items
 * without the fact. Each row's share of the largest is by Market value, or
 * by Items when no group has a value, so the bars always say something.
 */
export function breakdownRows(
  groups: GroupTotal[],
  limit = shownGroups,
): BreakdownRow[] {
  const known = groups.filter((group) => group.key !== notRecorded);
  const unknown = groups.filter((group) => group.key === notRecorded);
  const rest = known.slice(limit);
  const folded: (GroupTotal & { others?: number })[] =
    rest.length > 1
      ? [
          {
            key: otherGroups,
            items: rest.reduce((sum, group) => sum + group.items, 0),
            marketValue: rest.reduce(
              (sum, group) => sum + group.marketValue,
              0,
            ),
            others: rest.length,
          },
        ]
      : rest;
  const rows = [...known.slice(0, limit), ...folded, ...unknown];
  const byValue = rows.some((row) => row.marketValue > 0);
  const measure = (row: GroupTotal) => (byValue ? row.marketValue : row.items);
  const largest = Math.max(0, ...rows.map(measure));
  return rows.map((row) => ({
    ...row,
    share: largest > 0 ? measure(row) / largest : 0,
  }));
}
