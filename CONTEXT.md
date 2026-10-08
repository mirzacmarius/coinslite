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

**Collection**:
Everything a single user owns: the sum of all their Items.
_Avoid_: Portfolio, inventory, "my collection" for a named subset

**Album**:
A named, user-created group of Items within a Collection. An Item belongs to at most one Album.
_Avoid_: Collection (for a named group), folder, set, list

**Grade**:
The assessed condition of an Item's pieces, expressed as a value on a Grading scale.
_Avoid_: Condition, quality, state

**Grading scale**:
A named, ordered set of Grades used to assess condition, such as Sheldon 1–70 or the Norwegian 0–3 scale. Each country has a default scale.
_Avoid_: Grading system, rating

**Strike**:
How a coin was manufactured: circulation, brilliant uncirculated (BU) or proof. It is independent of Grade: a proof coin still has a Grade.
_Avoid_: Finish, quality, using "Proof" or "BU" as a Grade

### Catalog

**Catalog**:
The shared reference list of issued coins and banknotes that users pick from when adding Items, maintained by admins.
_Avoid_: Database, library

**Catalog entry**:
One specific issue in the Catalog that an Item can be created from, such as "2 øre 1918". An Item created from a Catalog entry takes its descriptive facts from that entry unless the user overrides them.
_Avoid_: Catalog item, listing, record

**Theme**:
A top-level Catalog grouping whose entries span several countries, such as 2-euro commemoratives.
_Avoid_: Region, area, group

**Set**:
All Catalog entries under one Catalog grouping, seen as something a user can complete, for example every year of a denomination within a series. A Set's completion is how many of its entries the user's Collection contains.
_Avoid_: Checklist, run, series (for the whole group)

### Money

**Home currency**:
The single currency a user's prices and values are recorded and shown in.
_Avoid_: Base currency, default currency, display currency

**Purchase price**:
What the user paid for one piece of an Item.
_Avoid_: Paid, cost, buy price

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
The paid plan. It unlocks an unlimited number of Items, the insurance report and CSV export.
_Avoid_: Pro, subscription (as the name of the plan)
