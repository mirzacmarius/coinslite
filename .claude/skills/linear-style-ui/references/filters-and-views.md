# Filters, display options, lists, grids, grouping, empty states

Read this for the Collection, Catalog browsing, Albums list, admin tables, or anything with
search, filter, sort, pagination, a list or a grid.

## Toolbar

`flex h-10 items-center justify-between gap-2 border-b px-4`:

- Left: **Filter** button (`ghost`, `xs`, `ListFilter` icon, label "Filter"; when filters are
  active a count pill `ml-1 rounded-md bg-accent px-1 text-xs text-accent-foreground`), then
  the **search** field: an `Input` `h-7 w-[200px]` with a `Search` icon inside (`pl-7`) that
  expands to `w-[280px]` on focus; `/` focuses it.
- Right: **Display** button (`ghost`, `xs`, `SlidersHorizontal` icon), then any
  view-specific buttons (Export for Premium).
- Active filters render on a second row (`flex flex-wrap items-center gap-1.5 border-b px-4
  py-2`) as chips plus a trailing ghost `xs` "Clear" button.

## Filter flow

1. Click Filter (or press `F`) → `Popover` with a `Command`: search input, then one item per
   dimension with its icon: Item type, Origin, Country, Denomination, Grade, Album. Typing
   filters dimensions and, like Linear, also matches values directly ("trav" offers "Album is
   Travel").
2. Choosing a dimension swaps the Command's list to that dimension's values: a `Checkbox`-style
   row (`Check` icon slot on the left that fills when selected), the value, and the count on
   the right in `text-xs text-muted-foreground`. Multi-select stays open; Esc or clicking out
   commits. A `←` ghost row at top goes back to dimensions.
3. Each active dimension becomes one **chip**.

### Filter chip

A segmented group, `inline-flex h-7 items-stretch overflow-hidden rounded-md border
text-[13px]`, with `divide-x`:

```
[ icon Album ] [ is any of ▾ ] [ ● Travel, ● Modern ▾ ] [ × ]
```

- Segment 1: dimension icon + name, `px-2 text-muted-foreground`.
- Segment 2: operator button ("is", "is not", "is any of"), opens a tiny DropdownMenu. Only
  show operators that matter for that dimension; Origin and bullion have none.
- Segment 3: value button; re-opens the value picker Popover. Shows up to 2 values, then
  "+N".
- Segment 4: remove, `X size-3.5`, `aria-label="Remove filter: Album"`.

Filter state lives in the URL (`?type=coin&album=…&country=NO`), so chips are derived from
search params and the page is shareable (spec §7). Use a
small `useCollectionFilters()` hook over `useSearchParams`/`useRouter` (or `nuqs` if it gets added); never keep filters in component state alone.

## Display popover

`PopoverContent className="w-[260px] p-1"` with rows `h-8 px-2 text-[13px] justify-between`:

- View: a `ToggleGroup` list/grid (icons `List`, `LayoutGrid`).
- Sort: a `PropertyPicker`-style inline Select with the six orders (spec §7).
- Group by: none / Item type / Album / Country.
- Page size: 15 / 25 / 50 as a `ToggleGroup`.
- `Separator`, then toggles for optional columns ("Show Market value", "Show Metal value").

View and page size persist on the device (`localStorage`, key `collection.display`); sort and
grouping go in the URL with the filters.

## List rows

Row: `group flex h-10 items-center gap-3 px-4 text-[13px] hover:bg-muted/60
data-[selected]:bg-muted`, wrapped by a `Link` so the whole row is clickable. Left to right:

1. Thumbnail `size-7 rounded-md border bg-muted object-cover`, or `ItemTypeIcon` from `@coinslite/ui/item-type-icon` when there is no photo.
2. Title `font-medium truncate` with the Strike as a muted suffix if proof/BU.
3. `text-muted-foreground` facts: year · denomination · country (truncate).
4. Right-aligned, fixed-width columns: Grade (`Badge` quiet), Quantity (`×2` muted when > 1),
   Purchase price, Market value (`tabular-nums`, `w-24 text-right`), gain `text-success` or
   `text-destructive`.
5. Hover-only `MoreHorizontal` ghost icon button (`opacity-0 group-hover:opacity-100`).

On `< md` keep thumbnail, title, facts and Market value only.

Use `Table` only when there are more than ~6 numeric columns (admin, insurance report preview);
there, keep headers sortable with a `ChevronUp/Down` on the active column.

## Grouped lists

When "Group by" is set, render sticky headers: `sticky top-0 z-10 flex h-8 items-center gap-2
bg-background/95 px-4 text-xs font-medium text-muted-foreground backdrop-blur`, with the group
icon or Album dot, its name, and the count. Groups are Collapsibles; collapsed state is not
persisted.

## Grid

`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 p-4`; card `rounded-lg border bg-card
overflow-hidden hover:bg-muted/40` with the image `aspect-square object-cover bg-muted`, then
`p-2.5`: title `text-[13px] font-medium truncate`, facts `text-xs text-muted-foreground`, and
Market value right-aligned on the last line.

## Pagination

Footer row `flex h-10 items-center justify-between border-t px-4 text-xs text-muted-foreground`:
"1–25 of 134" left; `ghost icon-xs` previous/next on the right. Page size lives in Display.

## Selection and bulk actions

Keep a `Checkbox` hidden until hover or until any row is selected (`opacity-0
group-hover:opacity-100 data-[state=checked]:opacity-100`). When ≥1 selected, a floating bar
appears bottom-centre: `fixed bottom-4 left-1/2 -translate-x-1/2 flex h-10 items-center gap-2
rounded-lg border bg-popover px-3 shadow-lg` with the count and actions (Move to Album, Delete).

## Empty states

Two different ones; don't reuse the generic card for both:

- **Truly empty** (no Items at all): the existing `EmptyState` with the type icon, "Add your
  first Item" and one primary button.
- **Filtered empty**: a quieter inline block `py-12 text-center text-sm text-muted-foreground`
  with "No Items match these filters" and a ghost `xs` "Clear filters" button. No icon, no
  dashed border: the user hasn't done anything wrong.

Loading: skeleton rows with the same `h-10` rhythm (`animate-pulse rounded bg-muted` bars),
never a centred spinner for lists.
