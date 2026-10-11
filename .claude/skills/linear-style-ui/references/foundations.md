# Foundations: sizes, tokens, patched primitives

Read this when you are sizing anything, patching a shadcn component in `packages/ui`, or
unsure which class to reach for. Tailwind 3.4, `new-york` style, Radix primitives.

## Size table

| Token | Value | Use |
|---|---|---|
| `text-[13px] leading-5` | 13/20 | Sidebar, toolbars, list rows, pills, menu items, chips, panel rows |
| `text-sm` | 14/20 | Inputs, form labels, dialog body, reading text |
| `text-xs` | 12/16 | Counts, hints, timestamps, section headers in sidebar and panels |
| `text-[15px] font-medium` | 15 | Page title in the header bar |
| `text-xl font-semibold` | 20 | Hero numbers (totals) only |
| `h-7` | 28px | Toolbar buttons, pills, sidebar rows, menu items, chips |
| `h-8` | 32px | Inputs, form buttons, dialog footer buttons |
| `h-9` / `min-h-10` | 36/40px | List rows |
| `size-4` | 16px | Icons everywhere; `size-3.5` inside chips and Kbd |
| `gap-1.5` / `gap-2` | 6/8px | Inside a control |
| `gap-3` / `gap-4` | 12/16px | Between controls / between sections |
| `p-4` | 16px | Dialog body, panel sections, cards |
| `px-4 py-3` | | Dialog header and footer |
| `rounded-md` | 6px | Controls, pills, rows, menu items |
| `rounded-lg` | 8px | Dialogs, popovers, sheets |
| `rounded-xl` | 12px | The page panel and content cards (`rounded-xl bg-card`, no border) |
| `rounded-full` | | Avatars, colour dots only (not badges) |
| `w-[232px]` | | Left sidebar |
| `w-[280px]` | | Right properties panel (`lg:w-[300px]` on wide screens) |
| `max-w-[560px]` / `[640px]` | | Create dialog |
| `max-w-[400px]` | | Confirm dialog |
| `sm:max-w-[480px]` | | Sheet |

## Surface and colour tokens (from globals.css)

| Need | Class |
|---|---|
| Page | `bg-background text-foreground` |
| Content panel, card, phone header | `bg-card` |
| Shell chrome (sidebar, around the panel) | `bg-sidebar`; hover/current rows `bg-sidebar-accent` |
| Link text, checkmarks | `text-link` |
| Floating layer | `bg-popover text-popover-foreground border shadow-md` |
| Hover row/pill, selected row, current nav | `hover:bg-muted`, `bg-muted` |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` |
| Dividers | `border-border` (default via `*`), `divide-y` for row lists |
| Primary action | `bg-primary text-primary-foreground` (one per view) |
| Positive number | `text-success` |
| Error text, destructive button | `text-destructive`, `bg-destructive` |
| Accent fill (rare) | `bg-accent text-accent-foreground`: checkmarks, tiny count badge on the Filter button |

Don't add new colours. Status and type are conveyed by an icon (`Coins`, `Banknote`, `Stamp`),
a 6px colour dot for Albums (`size-1.5 rounded-full` with an inline `style={{ background }}`
from the album's fixed palette), and text.

## Z layers

`z-40` fixed chrome (phone tabs), `z-50` overlays and dialogs (shadcn default), popovers inside
dialogs also `z-50` (Radix portals stack by DOM order, so this works).

## Motion

```
Popover/menu:  data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-[0.98] zoom-out-[0.98] duration-150
Dialog:        fade-in-0 fade-out-0 zoom-in-[0.98] zoom-out-[0.98] duration-150   (no slide classes)
Sheet (right): slide-in-from-right slide-out-to-right duration-200
Sheet (bottom):slide-in-from-bottom slide-out-to-bottom duration-200
Hover colour:  transition-colors duration-100
```

## Patched primitives

Apply these once in `packages/ui/src/components`; don't override heights at call sites.

### Button

Add an `xs` size for chrome, make `sm` the form default, keep `default` for marketing/web only,
add a `subtle` variant (Linear's grey button) and make `ghost` the pill base.

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-card hover:bg-muted",
        subtle: "bg-muted text-foreground hover:bg-muted/70",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2 text-[13px]",
        sm: "h-8 px-2.5 text-sm",
        default: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-sm",
        icon: "size-8",
        "icon-xs": "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
);
```

### Input and Textarea

```tsx
"flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
```

A borderless variant for dialog titles and notes (see overlays.md):
`"w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none"`.

### Dialog

- Overlay: `bg-black/40` (not `/80`).
- Content: `rounded-lg border bg-popover p-0 shadow-lg sm:max-w-[560px]`, remove the slide
  classes, use the motion above, and do **not** render the absolute close button; the header
  row renders its own.
- `DialogHeader`: `flex items-center justify-between gap-2 px-4 py-3` (not centered text).
- `DialogTitle`: `text-sm font-medium` (dialog titles are small; the content carries weight).
- `DialogFooter`: `flex items-center justify-between gap-2 border-t px-4 py-3`.

### DropdownMenu, Command items

Item: `h-7 rounded-md px-2 text-[13px] gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground`.
Content: `min-w-[200px] rounded-lg p-1 shadow-md`. Shortcut slot: `ml-auto` with `<Kbd>`.
Swap `@radix-ui/react-icons` for lucide (`Check`, `ChevronRight`, `Circle`) so icons match.

### Badge

Default should be quiet: `rounded-md border bg-transparent px-1.5 py-0 text-xs font-medium
text-muted-foreground`. Keep `success`/`destructive` for the rare status badge, but prefer a
dot + text for anything in a list.

### Table

Header cells `h-8 text-xs font-medium text-muted-foreground`; body cells `h-9 py-0 px-3
text-[13px]`; numeric cells `text-right tabular-nums`; row `hover:bg-muted/60`
`data-[state=selected]:bg-muted`.

### Kbd (new, tiny; also in `assets/components/kbd.tsx`)

```tsx
// packages/ui/src/components/kbd.tsx
import type * as React from "react";
import { cn } from "../utils";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
```

`useModifierKey()` in the same file returns `⌘` on Apple devices, `Ctrl` elsewhere and `null`
on the server, so hints render as `<Kbd>{mod}K</Kbd>` only once the platform is known.

### Tooltip

`sideOffset={6}`, content `rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md`.
Pattern for icon buttons:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon-xs" aria-label={t("collection.filter")}>
      <ListFilter />
    </Button>
  </TooltipTrigger>
  <TooltipContent className="flex items-center gap-2">
    {t("collection.filter")} <Kbd>F</Kbd>
  </TooltipContent>
</Tooltip>
```
