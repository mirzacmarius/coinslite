# Slim entries are a read model of Catalog entries

Items read their descriptive facts from their Catalog entry (ADR 0001), and the Collection list resolves every Item in a Collection on each run. Reading whole entries also read their notes in every language, which pushed Collections of a few thousand linked Items past what one query may read. Each Catalog entry therefore has a slim entry beside it (`catalogSlimEntries`): its key, title and the fields Items take facts from, nothing else. Every reader of resolved Items goes through `items/resolve.ts`, which reads slim entries instead of entries.

A slim entry is a read model of its entry, not a second source of truth. Nobody edits it: `catalog/tree.ts`, which every Catalog save goes through (CSV import, editor, seed), works it out from the entry it has just written (`slimEntryOf`) and deletes it when the node stops being an entry; `catalog/changes.ts`, which deletes nodes a batch at a time, deletes it when the node leaves the Catalog. A slim entry that disagrees with its entry is a bug, fixed by running `catalog/slimEntries:backfill` again. Readers fall back to the whole entry while an entry has no slim entry yet, which is only the case before that backfill has run once.

## Considered options

- **Copying the facts onto each Item.** Rejected by ADR 0001: Catalog corrections would no longer reach existing Items.
- **Keeping the facts on the entry and only paging the Collection.** Every filter, sort and search needs every Item's facts, so the whole Collection is still read on each run.

## Consequences

- A slim entry is written only when what it says changes, so an edit to an entry's notes, image or sources doesn't re-run every Collection that holds it.
- A Catalog write with no room left in its transaction (a very large CSV import) stores the remaining slim entries in a mutation scheduled straight after it, so those Items show the old facts for a moment.
- A new fact Items take from entries goes into `CatalogEntryFacts` (`items/catalogFacts.ts`); the compiler then asks for it in the slim entry, and the schema needs the field on `catalogSlimEntries` too, followed by a run of the backfill.
