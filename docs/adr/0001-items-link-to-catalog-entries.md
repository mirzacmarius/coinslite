# Items link to their Catalog entry instead of copying it

When a user creates an Item from a Catalog entry, the Item keeps a reference to that entry and reads its descriptive facts from it: country, denomination, year, series, Strike, metal, weight, fineness, diameter and so on. The Item stores only what belongs to the user: Grade, Quantity, prices, purchase date and source, photos, notes and Album, plus any descriptive field the user deliberately overrides. Items registered manually carry their own descriptive facts.

The obvious alternative is copying the entry's facts onto the Item when it's created. That freezes every mistake: a Catalog entry recorded with the wrong metal would keep showing a Metal value that doesn't exist on every Item made from it, even after an admin corrects the entry. Linking means Catalog corrections and enrichments (images, notes, measurements) reach existing Items automatically. The cost is that reading an Item means resolving its entry, plus a clear rule that user overrides win. It's recorded because it shapes the Item schema and every place an Item is shown.

Items are resolved from slim entries: a read model of each entry that holds only the facts Items take, so reading a whole Collection never reads entry notes (ADR 0008).
