# CoinsLite

CoinsLite is a web app where collectors record the coins, banknotes and stamps they own, organise them, and track what they paid and what they are worth.

## Language

### Collecting

**Item**:
One or more identical physical pieces a user owns, sharing the same catalog entry, grade and purchase details. A piece with a different grade or purchase is a separate Item.
_Avoid_: Coin (when meaning any owned thing), piece, entry, holding

**Item type**:
The kind of physical object an Item is: coin, banknote or stamp.
_Avoid_: Category, kind

**Quantity**:
How many identical pieces an Item stands for.
_Avoid_: Count, amount

**Date acquired**:
When an Item became the user's: its purchase date, or when it was recorded in CoinsLite if that is earlier or it has no purchase date.
_Avoid_: Date added (that is when it was recorded), acquisition date

**Collection**:
Everything a single user owns: the sum of all their Items.
_Avoid_: Portfolio, inventory, "my collection" for a named subset

**Album**:
A named, user-created group of Items within a Collection. An Item belongs to at most one Album.
_Avoid_: Collection (for a named group), folder, set, list

**Share link**:
A read-only web address for one Album or Set, made by its owner, that shows a chosen part of it to whoever has the link, signed in or not. Stopping the share makes the link stop working.
_Avoid_: Public page, publishing, link sharing (for the link itself)

**Kept in**:
Where an Item's pieces physically are, as the collector describes it ("Safe deposit box 2, tray 3"). Free text on each Item; the Collection filters and searches by it.
_Avoid_: Location, storage, home

**Tag**:
A collector's own word, or few words, on an Item ("For sale", "Out for grading", "Inherited"), several per Item, to find and narrow the Collection by. Tags that differ only in capitals, accents or spacing are one tag.
_Avoid_: Label (a printed label), keyword, category (a Catalog entry's)

**Grade**:
The assessed condition of an Item's pieces, expressed as a value on a Grading scale.
_Avoid_: Condition, quality, state

**Grading scale**:
A named, ordered set of Grades used to assess condition, such as Sheldon 1–70 or the Norwegian 0–3 scale. Each country has a default scale.
_Avoid_: Grading system, rating

**Suggested Grade**:
A Grade the scanner suggests from an Item's photos, on the scale the Item starts on: the lower of two when in doubt, none when the photos can't tell. The form marks it as the scanner's suggestion until the collector changes it.
_Avoid_: AI grade, automatic grade, estimated grade

**Strike**:
How a coin was manufactured: circulation, brilliant uncirculated (BU) or proof. It is independent of Grade: a proof coin still has a Grade.
_Avoid_: Finish, quality, using "Proof" or "BU" as a Grade

**Certification**:
A grading service's record that backs a coin's or banknote's Grade: the grader (PCGS, NGC, PMG…) and the certificate number on its slab, written "PCGS 12345678". Stamps have none.
_Avoid_: Slab, cert, Grade (for the certificate itself)

**Stamp catalogue**:
A published numbering of stamps, such as Michel, Scott or Norgeskatalogen, that identifies a stamp by its number there. It is not the Catalog: CoinsLite holds no stamp entries.
_Avoid_: Catalog, Catalog entry (for a stamp's number)

### Catalog

**Catalog**:
The shared reference list of issued coins and banknotes that users pick from when adding Items, maintained by admins.
_Avoid_: Database, library

**Catalog entry**:
One specific issue in the Catalog that an Item can be created from, such as "2 øre 1918". An Item created from a Catalog entry takes its descriptive facts from that entry unless the user overrides them.
_Avoid_: Catalog item, listing, record

**Theme**:
A top-level Catalog grouping whose entries span several countries: issued by several, such as 2-euro commemoratives, or circulating in several, such as euro banknotes. Its children are its countries, or its series when its money has no country of its own.
_Avoid_: Region, area, group

**Set**:
All Catalog entries under one Catalog grouping, seen as something a user can complete, for example every year of a denomination within a series. A Set's completion is how many of its entries the user's Collection contains.
_Avoid_: Checklist, run, series (for the whole group)

**Wantlist**:
The Catalog entries a user is looking for and has marked as wanted, one want per entry. Adding an Item from a wanted entry takes it off the Wantlist.
_Avoid_: Wishlist, shopping list, missing (that's a Set's entries not held)

### Money

**Home currency**:
The single currency a user's prices and values are recorded and shown in.
_Avoid_: Base currency, default currency, display currency

**Purchase price**:
What the user paid for one piece of an Item.
_Avoid_: Paid, cost, buy price

**Purchase currency**:
The currency an Item was bought in, when it isn't the Home currency. The Purchase price is converted from it at the ECB rate of the purchase date, and the Item keeps the amount as it was in the Purchase currency.
_Avoid_: Foreign currency, paid currency, original currency

**ECB rate**:
The European Central Bank's euro reference rate of a day, which converts a Purchase price from its Purchase currency. On a day the ECB doesn't publish, the last working day's before it.
_Avoid_: Exchange rate of the day, historical rate

**Market value**:
The user's own estimate of what one piece of an Item is worth today, for example from sales they have seen. Always entered by the user, never calculated.
_Avoid_: Estimated value, current value, price

**Spot price**:
The current market price of one gram of gold or silver, in the user's Home currency.
_Avoid_: Metal price, rate

**Metal value**:
The worth of an Item's precious metal content: weight × purity × Spot price × Quantity.
_Avoid_: Melt value, bullion value, intrinsic value

**Gain/loss**:
Market value minus Purchase price, summed over the Items in question.
_Avoid_: Profit, return, delta

**Insured value**:
For each Item in an Insurance report, the highest of the values chosen for that report.
_Avoid_: Insurance value, replacement value

**Insurance report**:
A document for an insurer listing the chosen Items with their chosen values, the owner's details and totals.
_Avoid_: Insurance export, valuation report

### Plans

**Free plan**:
The unpaid plan, limited to 50 Items regardless of their Quantity.
_Avoid_: Basic, trial

**Premium**:
The paid plan. It unlocks an unlimited number of Items, the insurance report, the Collection exports (PDF and CSV) and labels to print.
_Avoid_: Pro, subscription (as the name of the plan)
