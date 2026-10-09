Drop-in files for `packages/ui/src/components/`. `kbd.tsx` and `property-picker.tsx` already
exist in the repo; the asset `property-picker.tsx` is a strict superset of the committed one
(same `onChange(value: T)` for single select, same `id`/`align`/`className`), adding
`multiple`, `allowCreate`/`onCreate`, `clearLabel`/`onClear`, `header` and `disabled`. When a
ticket needs one of those, replace the repo file with the asset; existing call sites keep
compiling. The others are new: copy, add the `exports` entry in `packages/ui/package.json`
(`"./property-row": "./src/components/property-row.tsx"`), run `bun format`, and show the
component in the `/design` gallery. They assume the patched `Button`/`Input` and the shadcn
`popover`, `command` (present) and `alert-dialog` (add it) components.

| File | What | Needs |
|---|---|---|
| kbd.tsx | Keycap for shortcut hints, plus `useModifierKey()` (⌘ or Ctrl) | in repo already |
| property-picker.tsx | The pill: Popover + Command, single or `multiple`, inline create, clear, header slot | popover, command, button |
| property-row.tsx | Label/value row for the right panel (+ `PropertyValue` for read-only) | nothing |
| confirm-dialog.tsx | ~400px confirmation with pending state | alert-dialog, button |
| money-input.tsx | Minor-unit money field with currency suffix; commit on Enter/blur | input |
| quantity-input.tsx | 28px in-place whole-number field, min 1 | input |
