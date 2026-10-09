# Overlays: dialogs, confirmations, sheets, popovers, command dialog, viewer

Read this when a ticket mentions modal, dialog, confirm, drawer, sheet, popover, menu, picker,
palette, lightbox or "open in a panel".

## Choosing

| Need | Use | Not |
|---|---|---|
| Create something, ≤ ~8 primary fields | Create dialog (below) | A full page |
| Confirm delete / irreversible | AlertDialog, ~400px | Toast with undo (fine for reversible) |
| Edit a long form, or peek a thing from a list without leaving | Sheet, right side, 480px | Dialog with scrolling |
| Pick from a list, set a property | Popover + Command | Select, DropdownMenu with 30 items |
| Few static actions on a thing | DropdownMenu / ContextMenu | Popover with buttons |
| Search everything, jump anywhere | CommandDialog | A search page |
| Look at a photo | Full-screen Dialog | Opening in a new tab |

Rule of thumb: a dialog is for making one new thing; a sheet is for looking at or editing an
existing thing; a popover is for changing one value.

## Create dialog (the Linear "new issue" shape)

Width `sm:max-w-[600px]`, `p-0`, overlay `bg-black/40`. No big title. Structure:

```
┌ header  px-4 py-3 ───────────────────────────────────────────┐
│ [Coins] Collection › New Item                   [⤢] [×]     │   13px, muted breadcrumb, icon buttons
├ body  px-4 pt-2 pb-3 flex flex-col gap-2 ───────────────────┤
│ Title                                   (borderless, 16px)  │
│ Add notes…                              (borderless, 14px)  │
│ [Coin ▾] [Album ▾] [Grade ▾] [Strike ▾] [Country ▾] [Date]  │   property pills, flex-wrap gap-1.5
│ ▸ More details                                               │   Collapsible for optional fields
├ footer  border-t px-4 py-3 ─────────────────────────────────┤
│ [📎] [Create more ◯]                 [Cancel] [Add Item ⌘↵] │
└──────────────────────────────────────────────────────────────┘
```

Why: the user's attention goes to the one field that matters (title); structured attributes
are pills because they are quick to set and quick to skip; optional facts are hidden until
needed. Linear's create flow works because nothing competes with the title.

Code skeleton (`apps/app/src/components/items/add-item-dialog.tsx`):

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    className="sm:max-w-[600px]"
    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") form.handleSubmit(); }}
  >
    <DialogHeader>
      <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <TypeIcon className="size-4" />
        <span>{t("nav.collection")}</span>
        <ChevronRight className="size-3.5" />
        <DialogTitle>{t("items.new")}</DialogTitle>
      </div>
      <DialogClose asChild>
        <Button variant="ghost" size="icon-xs" aria-label={t("common.close")}><X /></Button>
      </DialogClose>
    </DialogHeader>

    <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
      <input autoFocus className={titleInputClass} placeholder={t("items.titlePlaceholder")} {...titleField} />
      <textarea rows={2} className={notesInputClass} placeholder={t("items.notesPlaceholder")} {...notesField} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        <PropertyPicker icon={Coins} label={t("items.type")} value={...} options={...} />
        <PropertyPicker icon={Folder} label={t("items.album")} ... allowCreate />
        <PropertyPicker icon={Award} label={t("items.grade")} ... />
        <DatePicker label={t("items.purchaseDate")} ... />
      </div>
      <Collapsible>
        <CollapsibleTrigger className="flex h-7 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-3.5 transition-transform data-[state=open]:rotate-90" />
          {t("items.moreDetails")}
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3">…labelled inputs…</CollapsibleContent>
      </Collapsible>
    </div>

    <DialogFooter>
      <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Switch checked={createMore} onCheckedChange={setCreateMore} /> {t("items.createMore")}
      </label>
      <div className="flex items-center gap-2">
        <DialogClose asChild><Button variant="ghost" size="sm">{t("common.cancel")}</Button></DialogClose>
        <Button size="sm" onClick={form.handleSubmit} disabled={!canSubmit}>
          {t("items.add")} <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0">⌘↵</Kbd>
        </Button>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Notes:
- Server-side errors appear as a one-line `text-xs text-destructive` above the footer, never
  as a toast while the dialog is open.
- "Create more" keeps the dialog open after a save, clears title and notes, keeps the pills.
- The Catalog picker (spec 6.2) is a `CommandDialog` opened from a "Pick from Catalog" pill or
  automatically when the type is coin/banknote; picking fills the pills and title.
- On phones the same content renders in `Sheet side="bottom"` with `h-[92dvh]`.

## Confirm dialog

`AlertDialog`, `sm:max-w-[400px] p-4 gap-3`. Title `text-sm font-medium` naming the thing
("Delete 'Travel'?"). Body `text-sm text-muted-foreground` with the consequence and numbers.
Footer right-aligned: `Cancel` (ghost, sm) then the destructive button (sm). Focus lands on
Cancel for destructive actions (`AlertDialogCancel` is first in DOM; Radix focuses it). Enter on
the destructive button, Esc cancels. `assets/components/confirm-dialog.tsx` is this wrapper:

```tsx
<ConfirmDialog
  open={open} onOpenChange={setOpen}
  title={t("albums.deleteTitle", { name })}
  description={t("albums.deleteBody", { count })}
  confirmLabel={t("albums.delete")}
  destructive
  onConfirm={remove}
/>
```

The Album delete flow (spec §8) has a checklist of Items inside the body: render it as a
scrollable `max-h-64 divide-y rounded-md border` list of `h-9` rows with a Checkbox at the
left; the confirm label updates with the count ("Delete Album and 3 Items").

## Sheet (drawer)

Right side on desktop, `sm:max-w-[480px] p-0`, same header/body/footer rhythm as the create
dialog, with the header carrying a plain title and a close button. Use it for: editing an
Item's full form from a list, the insurance report options, admin editing. Bottom side on
phones for anything that would be a dialog. Never stack two sheets; a sheet may open a dialog.

## Popover

`PopoverContent className="w-[240px] p-0" align="start" sideOffset={6}`. Almost always holds a
`Command` (see forms-and-fields.md for `PropertyPicker`). For a small settings popover
(Display options) use `p-1` with menu-like rows and `Separator`s.

## DropdownMenu and ContextMenu

Item rows `h-7 text-[13px] gap-2`; destructive items `text-destructive focus:text-destructive`;
shortcut `Kbd` on the right (`ml-auto`). Every list row offers the same actions via right-click
(ContextMenu) and via a `MoreHorizontal` button that appears on hover
(`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`).

## CommandDialog (global search, Catalog picker)

`sm:max-w-[640px] p-0`, input `h-11 text-sm border-b` with a `Search` icon, groups with
`text-xs text-muted-foreground px-2 py-1.5` headings, items `h-8`, right-side hints in `Kbd`.
Catalog picker specifics: results grouped by country then series, each row showing title, then
`text-xs text-muted-foreground` years · denomination · metal; a footer bar `h-8 border-t
text-xs text-muted-foreground` with the navigation hints (`↑↓` navigate, `↵` pick, `esc` close)
and the "Showing 50, refine your search" note when capped.

## Photo viewer

A `Dialog` with `DialogContent className="h-dvh w-screen max-w-none rounded-none border-0
bg-black/90 p-0"` showing the image `object-contain`, a close button top-right and, when both
sides exist, Left/Right arrows (keyboard too). Caption bottom-left in `text-xs text-white/70`.
