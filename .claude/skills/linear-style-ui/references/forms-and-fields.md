# Forms, field arrangement, property pills, inline editing

Read this for any form, any "arrange these fields" task, property pickers, dates, money
inputs, validation, and editing in place.

## Two form modes

**Compact (create dialogs).** Identity fields are borderless big inputs; structured attributes
are property pills; optional facts sit in a Collapsible. See overlays.md for the full shape.

**Full (settings pages, edit sheets, admin).** Labels above inputs, using `Field` from
`@coinslite/ui/field` (it renders the label, hint and error and hands the control its `id`
and ARIA attributes through a render prop):

```tsx
<Field id="title" label={t("items.title")} error={errors.title}>
  {(control) => <Input {...control} value={title} onChange={...} />}
</Field>
```

Which produces this structure:

```
<div className="flex flex-col gap-1.5">
  <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
  <Input … />
  <p className="text-xs text-muted-foreground">{hint}</p>      ← optional
  <p className="text-xs text-destructive">{error}</p>           ← only when invalid
</div>
```

Field groups: `grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2`. Put short, related fields
side by side (year + denomination, weight + purity, Purchase price + purchase date, diameter +
thickness); give text fields and notes `sm:col-span-2`. Sections are separated by a `Separator`
with a `text-xs font-medium text-muted-foreground` heading above the next group ("Purchase",
"Precious metal", "Catalog details"). Max form width `max-w-2xl`.

Dependent fields (weight and purity after a metal is chosen) render disabled with a hint, not
hidden, so the user understands why.

Required marks: none. Mark optional fields instead with "(optional)" in the label only in full
forms; in compact dialogs, the title is the only required field and nothing is marked.

## PropertyPicker (the pill)

The one component behind property rows, create-dialog pills and filter values. A complete,
typed implementation is in `assets/components/property-picker.tsx` (single or `multiple`,
counts, hints, `allowCreate`, `clearLabel`, `header` slot). Copy it into `packages/ui` rather
than writing a new one; the sketch below only explains the shape.

```tsx
// packages/ui/src/components/property-picker.tsx
type Option<T extends string> = { value: T; label: string; icon?: React.ReactNode; count?: number; hint?: string };

export function PropertyPicker<T extends string>({
  label, icon: Icon, value, options, onChange, placeholder, allowCreate, onCreate, multiple, align = "start",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={selected ? "subtle" : "ghost"} size="xs" aria-label={`${label}: ${selected?.label ?? placeholder}`}>
          {selected?.icon ?? <Icon className="text-muted-foreground" />}
          <span className={cn(!selected && "text-muted-foreground")}>{selected?.label ?? placeholder ?? label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={6} className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder={label} className="h-8 text-[13px]" />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{noResults}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); if (!multiple) setOpen(false); }} className="h-7 gap-2 text-[13px]">
                  {o.icon}
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    {o.count !== undefined && <span className="text-xs text-muted-foreground">{o.count}</span>}
                    {o.value === value && <Check className="size-4 text-primary" />}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {allowCreate && query && !exact && (
              <CommandGroup><CommandItem onSelect={() => onCreate?.(query)} className="h-7 gap-2 text-[13px]"><Plus /> {t("common.create", { name: query })}</CommandItem></CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

Behaviour:
- Keyboard: Space/Enter opens, typing filters, Up/Down move, Enter picks, Esc closes.
- `multiple` keeps the popover open and swaps the checkmark for a checkbox-style box.
- `allowCreate` offers `Create "Travel"` at the bottom when the query matches nothing exactly
  (Album inline creation, spec §5.4).
- Long option lists (Country, Grade on a 70-point scale) stay fast because Command virtualises
  nothing, so cap to what fits: group grades by scale, show countries with the user's own
  country and recent picks first in a "Suggested" group.
- The pill is `subtle` when it holds a value and `ghost` when empty, so empty pills recede.

### Variants

- **Grade**: two-level: a scale switcher at the top of the popover (`text-xs` segmented) and
  grades below; the pill shows "MS-63" with the scale as `hint`.
- **Date** (`DatePicker`): same pill with `Calendar` icon; popover holds a `Calendar`
  (react-day-picker) with quick picks above it (Today, Yesterday, Clear).
- **Quantity**: not a picker; an `Input type="number" min=1` `h-7 w-16 text-right` in place.
- **Money** (`MoneyInput`): `Input` with the currency code as a muted suffix inside
  (`relative` wrapper, `pr-12`, `absolute right-2 text-xs text-muted-foreground`), right-aligned,
  `inputMode="decimal"`; stores minor units.

## Property rows and inline editing (detail views)

Right-panel rows use `PropertyRow` + `PropertyPicker`. A change saves immediately with the
mutation, the pill shows the new value optimistically, and a toast "Album updated" with an
Undo action appears (`toast(..., { action })`). Text values (title, notes) edit in place:
clicking turns the text into a borderless input; Enter saves, Esc reverts, blur saves.
Why: Linear has no Save button on a detail view; each property is its own tiny transaction.

Don't put a form-wide Save/Cancel on a detail page. If a ticket needs a reviewed edit of
many fields at once, open the full form in a Sheet.

## Validation

- Validate on submit and then live per field after the first attempt (TanStack Form's
  `onSubmit` + `onChange` validators with Zod via `@tanstack/zod-form-adapter`).
- Errors inline under the field, `text-xs text-destructive`, with the input getting
  `aria-invalid` and `border-destructive`. One summary line above the footer in dialogs.
- Never disable the submit button for validation reasons alone; disable only while a
  mutation is in flight (show a `Loader2 animate-spin` inside the button, keep the label).
- Server limits (Free plan 50 Items) show as a banner row inside the dialog body:
  `rounded-md border bg-muted px-3 py-2 text-xs` with the upgrade link, and the submit stays
  enabled so the server message stays authoritative.

## Switch, Checkbox, Radio, SegmentedControl

- Boolean settings: `Switch` with the label to the left in settings rows (`flex h-9
  items-center justify-between`), label to the right inside dialogs.
- Two to four exclusive choices: the existing `SegmentedControl` (Item type, list/grid).
- More choices or long labels: `RadioGroup` stacked, 28px rows.
- Multi-choice lists: `Checkbox` rows `h-8`, label clickable.

## Keyboard summary for forms

| Key | Where | Does |
|---|---|---|
| Cmd/Ctrl+Enter | Any dialog or sheet form | Submit |
| Enter | Single-line inline edit | Save |
| Esc | Inline edit / popover / dialog | Revert / close topmost |
| Tab | Everywhere | Follows visual order; pills are focusable buttons |
| Space | Pill, checkbox, switch | Open / toggle |
