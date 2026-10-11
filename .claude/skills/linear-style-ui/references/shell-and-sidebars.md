# Shell, left sidebar, page header, right properties panel

Read this when touching `apps/app/src/components/shell/*`, a page's header/toolbar, a detail
view, or anything described as "sidebar", "panel", "split view" or "layout".

## Overall frame

```
┌─────────────┬──────────────────────────────────────┬──────────────┐
│ sidebar     │ header bar (h-10, border-b)          │ right panel  │
│ 232px       ├──────────────────────────────────────┤ 280px        │
│ bg-sidebar  │ toolbar: Filter … Display (h-10)     │ border-l     │
│ (chrome)    ├──────────────────────────────────────┤ bg-card      │
│             │ content (scrolls on its own)         │ (optional)   │
└─────────────┴──────────────────────────────────────┴──────────────┘
```

- From `md` up the shell is one `h-dvh` frame on `bg-sidebar`: the sidebar sits on the chrome
  with no border, and the content column is an inset panel (`rounded-lg border bg-background`,
  8px from the top, right and bottom edges) that is the scroll container (`main#main`). Sticky
  headers stick to the panel, and code that resets scroll must scroll `#main` as well as the
  window (phones still scroll the window). Only the content column scrolls. This keeps the toolbar and properties in view while a long list scrolls.
- Content column: `flex min-w-0 flex-1 flex-col`. Lists go edge to edge inside it (rows carry
  their own `px-4`), not inside a centred `max-w` box. Reading pages (Account, Plans) may use
  `max-w-2xl`.
- `AppShell` already provides the sidebar and phone tabs. Extend it with an optional `aside`
  slot for the right panel rather than building a second shell.

## Left sidebar

Anatomy, top to bottom (`p-2 gap-1`):

1. **Workspace row**: a ghost button `h-8 w-full justify-start gap-2 px-2` with the logo mark,
   the product name (`text-[13px] font-medium`) and a `ChevronDown`; opens a DropdownMenu with
   Account, Plans, Language, Theme, Sign out. The avatar goes at the right end of the row.
2. **Quick actions**: one `subtle` button `h-8 w-full justify-start` "Add Item" with a
   `Plus` icon and `Kbd C` at the right; and a ghost "Search" row with `Kbd ⌘K`. These are
   the two things users do most, so they sit above navigation.
3. **Primary navigation**: rows `h-7 rounded-md px-2 gap-2 text-[13px] font-medium`
   (`text-muted-foreground hover:bg-muted hover:text-foreground`, current
   `bg-muted text-foreground`, `aria-current="page"`). Icons `size-4` `strokeWidth 1.75`.
   Keep the current five: Overview, Collection, Catalog, Albums, Account.
4. **Sections** (`SidebarSection`): a header row `h-7 px-2 text-xs font-medium
   text-muted-foreground` that is a Collapsible trigger with a chevron visible on hover, and
   rows below with `pl-2`. Albums belong here as a section: each Album row shows its colour
   dot, name and count (`ml-auto text-xs text-muted-foreground`). A "+" ghost icon button on
   the header (visible on hover) creates an Album inline.
5. **Footer**: plan usage card (already exists) and nothing else. Language and theme move into
   the workspace menu so the footer stays quiet.

```tsx
export function SidebarSection({ title, action, defaultOpen = true, children }: Props) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/section">
      <div className="flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {title}
          <ChevronRight className="size-3.5 opacity-0 transition-transform group-hover/section:opacity-100 group-data-[state=open]/section:rotate-90" />
        </CollapsibleTrigger>
        {action && <div className="opacity-0 group-hover/section:opacity-100 focus-within:opacity-100">{action}</div>}
      </div>
      <CollapsibleContent className="flex flex-col gap-0.5 pt-0.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
```

Collapsing the whole sidebar (`[` shortcut, 56px icon rail) is optional; only add it when a
ticket asks. Don't add resizing.

## Settings pages

Account and other settings use `SettingsGroup`, `SettingsRow` and `SettingsBlock` from
`@coinslite/ui/settings-group`: a 15px group heading (and optional description) above a
`rounded-lg border bg-card` card whose rows are split by hairlines. A row has the setting's
name (`text-[13px] font-medium`) and a one-line description (`text-xs text-muted-foreground`)
on the left and its control on the right (a pill, a switch, or an outline menu button such as
the appearance picker with its "Aa" samples). Forms that need the card's width go in a
`SettingsBlock`. Links to sub-pages share one card of `h-9` rows with a chevron.

## Page header bar

Use `HeaderBar` from `@coinslite/ui/header-bar` (`title`, `parent`, `actions`); it is the 40px
row, `sticky top-0`, `border-b`, with the parent › title breadcrumb. Its anatomy:

- Left: breadcrumb-ish title. `text-[13px] font-medium`, with parent segments as ghost links
  and `ChevronRight size-3.5 text-muted-foreground` between them ("Albums › Travel"). For a
  detail view, the parent is a link and the current is the Item title truncated.
- Right: icon buttons (`ghost`, `icon-xs`) with tooltips, then the primary action as a
  `size="xs"` default button ("Add Item") at the far right. A view-level overflow menu is a
  `MoreHorizontal` icon button opening a DropdownMenu.

Every app screen starts with a `HeaderBar`. `PageHeader` (24px title) stays for the web
site only.

Below the header, list screens get a second 40px **toolbar** (`flex h-10 items-center
justify-between border-b px-4`): Filter and search on the left, Display on the right. See
`filters-and-views.md`.

## Right properties panel

Use it on detail views (Item detail, Catalog entry, Album) and in split views. `w-[280px]
shrink-0 border-l bg-card`, sections stacked with `divide-y`, each `p-4 flex flex-col gap-1`.

- Section header: `text-xs font-medium text-muted-foreground mb-1` ("Properties", "Purchase",
  "Metal").
- **Property row**: `grid grid-cols-[96px_1fr] items-center h-7`. Left: label `text-xs
  text-muted-foreground`. Right: the value as a `PropertyPicker` pill (editable) or a plain
  `text-[13px]` span (read-only, e.g. Metal value). Empty editable values show the placeholder
  verb in muted text ("Add Album", "Set Grade").
- Footer section: metadata in `text-xs text-muted-foreground` ("Added 3 Mar 2026 · Updated
  yesterday"), and the destructive action as a ghost `text-destructive` button if there is one.

`assets/components/property-row.tsx` ships this (plus `PropertyValue` for read-only values):

```tsx
export function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid h-7 grid-cols-[96px_1fr] items-center gap-2">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 justify-self-start">{children}</div>
    </div>
  );
}
```

Item detail layout: content column holds photos (two `aspect-square rounded-lg border
bg-muted` tiles side by side, click opens the viewer), then the title (`text-base
font-medium`), then descriptive facts as a two-column definition list (`grid grid-cols-2
gap-x-6 gap-y-2 text-sm`, label `text-muted-foreground` above value), then notes. Everything
the user edits often (Album, Grade, Strike, Quantity, prices, dates) lives in the right panel
as pills so it is one click to change.

## Split views

Catalog browsing and admin lists use list-left / detail-right: list column `w-[360px]
shrink-0 border-r overflow-y-auto`, detail fills the rest and may itself have a right panel.
Selected list row is `bg-muted`. Up/Down arrows move the selection, Enter opens it.

## Responsive fallbacks

- `< md`: no sidebar (phone tabs exist), header bar stays, toolbar shrinks to Filter + Display
  icons, right panel becomes a "Details" section rendered under the content, and split views
  become two routes (list, then detail).
- Keep `pb-28` on the content so the phone tabs never cover the last row.
