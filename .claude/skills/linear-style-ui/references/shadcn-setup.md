# Adding shadcn components in this monorepo

`packages/ui` holds the components (`components.json`: style `new-york`, Tailwind 3.4, CSS
variables, base colour gray). Consumers import per file: `import { Button } from
"@coinslite/ui/button"`.

## Add a component

```bash
cd packages/ui
bunx shadcn@latest add popover command sheet
```

Then do these post-add fixes every time (the CLI writes for a single app, not a workspace):

1. **Imports**: the CLI emits `@/utils` and `@/components/x`. Inside `packages/ui` these must
   become relative (`../utils`, `./x`). Reason: the Next app's own tsconfig maps `@/` to
   `apps/app/src`, so `@/utils` inside a transpiled package resolves to the wrong place.
2. **Exports**: add `"./popover": "./src/components/popover.tsx"` to the `exports` map in
   `packages/ui/package.json` (keep it alphabetical).
3. **Icons**: replace `@radix-ui/react-icons` imports with `lucide-react` equivalents
   (`CheckIcon`→`Check`, `ChevronRightIcon`→`ChevronRight`, `Cross2Icon`→`X`,
   `MagnifyingGlassIcon`→`Search`, `DotFilledIcon`→`Circle`), so every icon shares one
   stroke style.
4. **Sizing**: apply the density classes from `foundations.md` (menu items `h-7 text-[13px]`,
   content `rounded-lg`, overlay `bg-black/40`, motion `duration-150`).
5. **"use client"** stays at the top of interactive components.
6. Run `bun typecheck` and `bun lint` from the repo root; Biome formats on `bun format`.
7. Add a section to the `/design` gallery showing the component in the Linear arrangement.

Dependencies the CLI adds (`cmdk`, `@radix-ui/react-popover`, `react-day-picker`, `vaul`…)
land in `packages/ui/package.json`; run `bun install` at the root afterwards.

## Components this style needs

Already present (patched to this density): avatar, badge, button, card, checkbox, command,
dialog, dropdown-menu, empty-state, field, header-bar, input, item-type-icon, kbd, label,
page-header, popover, progress, property-picker, scroll-area, segmented-control, select,
skip-link, switch, table, toaster, tooltip, upload-input.

Add as needed, in this priority:

| Component | Used for |
|---|---|
| `property-row`, `confirm-dialog`, `money-input`, `quantity-input` (copy from `assets/components/`; the asset `property-picker` upgrades the repo one with multi-select and inline create) | Pattern primitives this style is built from |
| `collapsible` | Sidebar sections, "More details" in dialogs, grouped lists |
| `radio-group`, `toggle-group`, `textarea`, `separator` | Forms and Display menu |
| `alert-dialog` | Confirmations |
| `sheet` | Right drawers, phone bottom sheets |
| `context-menu` | Right-click on list rows |
| `calendar` (react-day-picker) | DatePicker pill |
| `tabs` | Settings sub-pages, Catalog browse/search |
| `skeleton` | Loading rows |
| `breadcrumb` | Header bar path (optional; a hand-rolled flex row is fine) |
| `resizable` | Only if a ticket asks for a draggable split view |

Not needed: `form` (the app uses TanStack Form), `navigation-menu`, `menubar`, `carousel`,
`accordion` (use Collapsible), `drawer`/vaul (Sheet covers it unless a ticket needs swipe).

## shadcn blocks

Blocks (`sidebar-07`, `dashboard-01`, login blocks…) are a source of composition ideas, not
drop-ins: they assume Tailwind 4 and a single app. Copy the structure, then re-express it with
this skill's sizes and the existing `AppShell`. Don't add the shadcn `sidebar` component unless
the collapsible icon rail is requested; `AppShell` plus `SidebarSection` covers the current
needs with less surface.

## Verifying visually

`bun dev:app` then open `/design` (public outside production). Check light, dark (toggle in
the shell), and a 375px viewport. The e2e axe scan lives in
`tooling/e2e/tests/design-system.spec.ts`; extend it when adding a new overlay so focus
management is tested.
