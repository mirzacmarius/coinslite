---
name: linear-style-ui
description: >
  How to build CoinsLite's product UI: shadcn/ui components and blocks (Radix, Tailwind 3, the
  "Ledger" tokens in packages/ui) arranged and styled the way the Linear app does it: dense,
  calm, keyboard-first chrome; property pills; command-menu pickers; filter chips; compact create
  dialogs; a left navigation sidebar and a right properties panel. Use this skill whenever you
  touch anything a user will see in apps/app or packages/ui: a page or screen, layout or shell,
  sidebar or panel, modal, dialog, confirmation, drawer or sheet, popover, dropdown or menu,
  filter or sort or search bar, list, table, grid, card, detail view, form or field layout,
  picker or combobox, command palette, empty state, settings page, toolbar, toast, or when
  adding or restyling a shadcn component. Use it even when the ticket only says "add a button"
  or "show a list": the sizing, spacing and interaction rules here are what make screens feel
  like one product.
---

# Linear-style UI on shadcn (CoinsLite)

shadcn gives us accessible primitives. This skill is the layer on top: how those primitives are
sized, arranged and wired so every CoinsLite screen reads like Linear does, while keeping the
Ledger colour tokens (slate neutrals, one teal accent) from `packages/ui/src/globals.css`.

The one-line brief: **Ledger colours, Linear structure.** Dense but never cramped, borders instead
of shadows, grey chrome with the accent spent only on the primary action and focus, every
structured value shown as a small pill you can click to change, and every surface reachable
from the keyboard.

Vocabulary in UI copy comes from `CONTEXT.md` (Item, Album, Grade, Strike, Catalog entry,
Market value...). Every visible string goes through the locale files (`apps/app/src/locales/*`),
so write `t("...")` keys, not literals.

## Workflow for any UI task

1. **Name the surface.** Use the decision table below to pick page, dialog, sheet, popover or
   panel. Most mistakes are picking a heavier surface than the job needs.
2. **Read the matching reference** in `references/` before writing JSX. They hold the anatomy,
   sizes and code recipes; this file holds only the rules that apply everywhere.
3. **Check `packages/ui/src/components`** for an existing component. If a shadcn component is
   missing, add it following `references/shadcn-setup.md` (monorepo gotchas: relative `../utils`
   imports, per-file `exports`, lucide icons).
4. **Build with the recipes**, then add a section to the `/design` gallery
   (`apps/app/src/app/[locale]/design/gallery.tsx`) if you created a reusable pattern.
5. **Run the checklist** at the end of this file: keyboard, both themes, phone width, axe.

## Which surface for which job

| Job | Surface | Reference |
|---|---|---|
| Navigate between areas | Left sidebar (232px), phone tabs | shell-and-sidebars |
| Show one thing's attributes next to its content | Right properties panel (280px) | shell-and-sidebars |
| Browse many things, open one | List or grid; open in place or in a split view | filters-and-views |
| Create something new (up to ~8 fields) | Compact create dialog, 560 to 640px | overlays |
| Edit an existing thing | Inline property pills in the panel; a sheet for long forms | forms-and-fields, overlays |
| Confirm a destructive action | Alert dialog, ~400px, names the thing and the count | overlays |
| Pick one or many values | Popover + Command list with search, checkmarks and counts | forms-and-fields |
| Search or pick across the whole catalog | Command dialog (Cmd/Ctrl+K style) | overlays |
| Narrow a list | Filter button → Command menu → chips under the toolbar | filters-and-views |
| Change sort, view, page size | Display popover | filters-and-views |
| View a photo | Full-screen viewer dialog | overlays |

## Rules that apply everywhere

### Density and sizing

Linear feels fast because nothing is oversized. Tailwind 3 classes, with the `--radius` of 8px
already in the tokens (`rounded-lg` 8, `rounded-md` 6, `rounded-sm` 4):

| Element | Size | Classes |
|---|---|---|
| App chrome text (sidebar, toolbars, lists, pills, menus) | 13px / 20px | `text-[13px] leading-5` |
| Form and reading text | 14px | `text-sm` |
| Secondary text, counts, hints | 12px | `text-xs text-muted-foreground` |
| Page title | 15 to 16px medium | `text-[15px] font-medium` |
| Icons | 16px, stroke 1.75 | `size-4` lucide, `strokeWidth={1.75}` |
| Toolbar buttons, pills, menu items | 28px | `h-7 px-2 rounded-md` |
| Form inputs and buttons | 32px | `h-8 px-2.5` |
| List rows | 36 to 40px | `h-9` or `min-h-10` |
| Sidebar nav rows | 28px | `h-7 px-2 gap-2` |
| Gaps inside a control | 6 to 8px | `gap-1.5` / `gap-2` |
| Sections, dialog padding | 16px | `p-4` (dialog header/footer `px-4 py-3`) |

The existing shadcn `Button` (h-10) and `Input` (h-10) defaults are too tall for this style.
`references/foundations.md` has the patched variants (`size="xs"` 28px, `sm` 32px as the
default); use those rather than overriding heights per call site.

### Surfaces, borders and shadows

- Separate regions with 1px `border-border`, not with shadows or background blocks. Shadows
  (`shadow-md`, `shadow-lg`) belong only to floating layers: popovers, menus, dialogs.
- Surfaces step by lightness: `bg-background` page, `bg-card` content panels, `bg-popover`
  floating. The sidebar uses `bg-sidebar`. Don't invent new greys; use `bg-muted` for hover and
  selected rows.
- Dialog overlay dims to `bg-black/40`, not `/80`. Heavy dimming reads as a different product.
- Rows and pills get `hover:bg-muted`; selected or current gets `bg-muted text-foreground`
  (neutral), not the teal accent. The accent is for the primary button, links, focus rings and
  checkmarks. One teal thing per view is plenty.

### Typography and colour of text

- Weight carries hierarchy: `font-medium` for titles of rows and dialogs, `font-semibold` only
  for the page title and totals. Never bold a whole row.
- Two text colours do all the work: `text-foreground` and `text-muted-foreground`. Use
  `text-destructive` for errors, `text-success` for gains, and nothing else.
- Sentence case everywhere: labels, buttons, menu items, section headers. No all-caps labels,
  no trailing periods on labels, no colons after labels.
- Numbers are tabular (already set on `body`) and right-aligned in columns. Money through
  `useFormatters().money`.

### Properties as pills

This is the central idiom and it unifies filters, forms and detail panels. A structured
attribute (Item type, Album, Grade, Strike, Country, purchase date) is rendered as a small ghost
button: icon, current value, 28px tall. Clicking opens a Popover with a Command list (search at
top, options with a checkmark on the current one, counts on the right where meaningful). The
same `PropertyPicker` appears in the create dialog's property row, in the right panel's
property rows, and inside filter chips. See `references/forms-and-fields.md` for the recipe.

Why: it keeps forms short (no stacked select boxes), makes editing in place trivial, and gives
users one interaction to learn.

### Keyboard first

- Esc closes the topmost layer. Cmd/Ctrl+Enter submits a dialog. Enter saves an inline edit,
  Esc reverts it.
- Icon-only buttons get a Tooltip with the label and, when one exists, a `<Kbd>` hint. Menu
  items show their shortcut on the right in a `Kbd`.
- Lists are arrow-key navigable (Command handles this for menus; for page lists use roving
  focus on the row link).
- `/` focuses the page's search field; Cmd/Ctrl+K opens the command dialog where one exists.
- Never trap focus outside Radix; let Dialog, Popover and Sheet manage it.

### Motion

Fast and quiet: `duration-150 ease-out` for fades and popovers, `duration-200` for sheets.
Keep shadcn's `animate-in` data-state classes but shorten their durations. No bounce, no
slide-in dialogs; dialogs fade and scale from 98%.

### Responsive

Desktop (`md:` and up) is the primary target but every surface must work at 375px:

- Dialogs under `sm` become full-width bottom sheets (`Sheet side="bottom"` or
  `inset-x-0 bottom-0 rounded-t-lg` on `DialogContent`).
- The right properties panel becomes a "Details" section below the content, or a sheet opened
  from a toolbar button.
- The filter toolbar collapses to one Filter button plus one Display button; chips wrap.
- The sidebar is already replaced by the four phone tabs in `AppShell`.

### Copy

Short, concrete and in the user's words: "Add Item", "Delete Album", "Clear filters". Dialog
titles name the object ("New Item", "Delete 'Travel'?"). Confirmations state consequences with
numbers ("This also deletes 3 Items and their photos."). Empty states say what to do next in one
sentence and offer the one button that does it.

## Checklist before you call a UI task done

- [ ] Right surface for the job (table above) and no heavier than needed.
- [ ] Sizes from the density table; no stray `h-10`, `text-lg`, `p-6`, `shadow` on static panels.
- [ ] Accent used once per view; selected states neutral grey.
- [ ] Every string through `t()`; nouns from `CONTEXT.md`.
- [ ] Esc, Enter, Cmd/Ctrl+Enter behave; Tab order follows the visual order; focus ring visible.
- [ ] Tooltips on icon-only buttons; `aria-label` on property pills ("Album: Travel").
- [ ] Looks right in light and dark (`.dark` class) and at 375px wide.
- [ ] Loading, empty and error states exist; filtered-empty differs from truly empty.
- [ ] New reusable pattern added to the `/design` gallery; e2e axe scan still passes
      (`bun test:e2e -- design-system`).

## References

- `references/foundations.md`: full size and token table, patched Button/Input/Dialog/Badge
  variants, Kbd component, motion classes, z-index layers.
- `references/shell-and-sidebars.md`: left sidebar anatomy and sections, page header and
  toolbar, right properties panel, split views, responsive fallbacks.
- `references/overlays.md`: create dialog, confirm dialog, sheet/drawer, popover, command
  dialog, photo viewer; when to use each and their code.
- `references/filters-and-views.md`: Filter button flow, filter chips, Display popover, list
  and grid rows, grouping, pagination, empty states.
- `references/forms-and-fields.md`: field arrangement in dialogs vs full forms, property
  pills and pickers, property rows, optional groups, validation, inline editing, TanStack Form.
- `references/shadcn-setup.md`: adding shadcn components to `packages/ui` in this monorepo,
  the list of components this style needs, and the post-add fixes.
