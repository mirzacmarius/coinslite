# CoinsLite functional specification

What CoinsLite must do for its first release. It covers behaviour only. Screen structure, navigation, visual design and all wording are decided by the design system (milestone M1) and written fresh. Terms follow [`GLOSSARY.md`](../GLOSSARY.md).

---

## 1. Platform

- Fully responsive web app for phone, tablet and desktop. Installable to the home screen.
- When a new version is deployed, open sessions pick it up automatically (on focus, on returning to the tab, and periodically).
- Signed-out visitors see the marketing site. Signed-in users go straight to the app.
- Opening a protected page while signed out leads to sign-in and then back to that page.

## 2. Accounts

- **Sign-up methods:** email + password (min 8 characters), magic link, or Google.
- **Sign-up:**
  - Accepting the privacy policy and terms is required.
  - Email/password accounts must verify their email before the account is active.
  - The display name defaults to the local part of the email.
  - The Home currency is preselected from the browser locale and can be changed.
- **Sign-in:** password, magic link or Google.
- **Password reset:** request a link by email, then set a new password.
- **Change email:** a confirmation link goes to the new address. The change applies once it's confirmed.
- **Sign out.**
- **Delete account:** from Account, beside Manage subscription, with an explicit confirmation. A subscription that would renew must be cancelled first.
  - Asking deactivates the account at once and emails the owner. A deactivated account can only be reactivated, deleted now, or signed out of; everything else is closed to it.
  - 14 days later a last email asks the owner to delete it now, or to reactivate it (and choose a plan again).
  - Without either, it stays deactivated for 7 more days and is then deleted without further warning.
  - Deleting permanently removes the user, their Items, Albums, photos and subscription link.
- **Unused Free accounts:** an account on the Free plan that nobody signs in to gets an email after 6 months, another after 8, and after 12 one saying it will be deleted 14 days later, which then happens. Signing in starts the count again.

## 3. Languages and regional settings

- **Launch languages:** English (default), Norwegian Bokmål, German, French, Romanian. Every screen, email, PDF and CSV header is translated. No mixed-language screens.
- **Language choice:** the user's stored choice, else the browser language, else English. It can be switched from anywhere in the app.
- **Translated:** UI text, country names, Item types, metals, Grading scale labels, Strike labels.
- **Kept in the issuing country's language:** Catalog entry titles and series names.
- **Catalog notes** (technical details, historical notes) show in the reader's language where translated, otherwise in the language of their source, marked with that language.
- **Numbers and dates:** formatted for the active language.
- **Countries are stored as ISO codes** and shown translated.

## 4. Home currency and money

- Each user has exactly one Home currency: NOK, SEK, DKK, EUR, RON, GBP, USD or CHF.
- All Purchase prices and Market values are entered and shown in the Home currency. Spot prices are converted into it.
- **Changing the Home currency:**
  - The user sees how many stored amounts will be converted, and at which exchange rate, and must confirm.
  - Every stored amount (Purchase prices, Market values, sale prices and the Market value history) is then converted exactly once at the confirmed rate, rounded to whole minor units. If any amount would be too large in the new currency, nothing is converted and the user is told.
  - A Collection of any size can change. One of up to 5,000 Items and 5,000 history points changes at once. A larger one is converted in the background, which can take a minute: the dialog says so beforehand, and the app says when it's done. A large Collection with no amounts just switches, once that's checked.
  - While a change is in the background, the Collection's money (amounts, totals, charts, the Insurance report's totals) shows as "Converting to …", and amount fields in the Item form, the sale dialog and Set purchase are disabled. Anything that writes an amount (an Item with a Purchase price or Market value, a sale price, selling part of an Item with amounts, a Purchase price set on several Items or undone, importing rows with amounts), the Collection exports and the Insurance report (their amounts would mix two currencies) and another change are refused with a clear message. Everything else works, including a sale without a price.
  - Amounts typed into a form opened before the Home currency changed are refused, and the form says to reopen it.
  - A background step that fails is retried a few times. If it still fails before anything was converted, the change is called off and the user is told; if it fails part-way, the user is told and can try again from where it stopped.
- Money is shown with the currency's symbol and conventional rounding for the active language.

## 5. Items

### 5.1 What an Item records
- **Item type:** coin, banknote or stamp.
- **Title:** required.
- **Descriptive facts:** country, year, denomination, series, category, material, Strike (coins and banknotes), mint mark, ruler, mintage, diameter, thickness, Numista number.
  - For an Item created from a Catalog entry, these come from the entry. The user may override any of them per Item, and overrides are kept when the entry changes.
- **Grade:**
  - A value picked from a Grading scale. The scale defaults to the country's default scale, and the user can switch to another scale for that Item type.
  - An optional free-text grade note.
- **Quantity:** whole number ≥ 1, default 1.
- **Purchase:** Purchase price per piece, purchase date, and source (where it was acquired).
- **Market value** per piece. Optional, entered by the user.
- **Notes.**
- **Album:** optional, at most one.
- **Photos:** one per side, front and back (obverse and reverse for coins).
- **Precious metal (coins):**
  - a bullion flag
  - metal (gold or silver)
  - weight in grams
  - purity (0–1)
  - Weight and purity can only be set once a metal is chosen.

### 5.2 Grading scales
| Item type | Scales | Default |
|---|---|---|
| Coin | Sheldon 1–70; Norwegian (0, 0/01, 01, 1+, 1, 1−, 2, 3); European (UNC, XF, VF, F, VG, G) | Norway → Norwegian; USA → Sheldon; elsewhere → European |
| Banknote | International (UNC, AU, XF, VF, F, VG, G, FR, PR); Norwegian 0–3 | Norway → Norwegian; elsewhere → International |
| Stamp | Mint never hinged, mint hinged, used | — |

Grades within a scale are ordered, so Items can be sorted and filtered by Grade.

### 5.3 Strike
Circulation, brilliant uncirculated (BU) or proof. Recorded separately from Grade, both on Catalog entries and on Items.

### 5.4 Adding an Item
- Adding opens the New Item page (Add Item, or C), not a dialog, so it's easy to fill in on a phone. It starts with the choice of Item type: coin, banknote or stamp, a coin to begin with. A Catalog entry, once linked, decides the type. For those who may scan, a coin starts with the coin scanner (§16), which hands over to the form with a coin chosen; a banknote or stamp, and everyone else, start with the form, its title in focus. Leaving with unsaved input asks first; adding goes to the new Item's page, or with **Create more** on, starts the next one.
- **Two ways to add:**
  - **From the Catalog** (coins and banknotes): the form's **Pick from the Catalog** opens the picker (§6.2) for the chosen type. The descriptive facts come from the picked entry. Not while the Catalog is hidden.
  - **Manually:** the user types the descriptive facts. Stamps are always added manually; the Catalog holds none.
- **Bullion presets** fill metal, weight, purity, country and title (title only if it's empty):

| Preset | Metal | Weight g | Purity | Country |
|---|---|---|---|---|
| Krugerrand 1 oz / ½ / ¼ / 1⁄10 | gold | 33.93 / 16.965 / 8.482 / 3.393 | 0.9167 | ZA |
| Maple Leaf 1 oz | gold | 31.103 | 0.9999 | CA |
| Britannia 1 oz | gold | 31.103 | 0.9999 | GB |
| Vienna Philharmonic 1 oz | gold | 31.103 | 0.9999 | AT |
| American Eagle 1 oz | gold | 33.93 | 0.9167 | US |
| American Buffalo 1 oz | gold | 31.103 | 0.9999 | US |
| Panda 30 g | gold | 30 | 0.9999 | CN |
| Maple Leaf 1 oz | silver | 31.103 | 0.9999 | CA |
| American Eagle 1 oz | silver | 31.103 | 0.999 | US |
| Britannia 1 oz | silver | 31.103 | 0.999 | GB |
| Vienna Philharmonic 1 oz | silver | 31.103 | 0.999 | AT |
| Krugerrand 1 oz | silver | 31.107 | 0.999 | ZA |
| Panda 30 g | silver | 30 | 0.999 | CN |

- **Albums in the form:** the user can pick an Album or create one inline. If they have exactly one Album, it is preselected.
- **Optional fields** are grouped so the basic form stays short. The group opens automatically when it already holds values.
- **Free plan limit:** with 50 Items, adding or duplicating is blocked with an upgrade path. A warning appears from 40 Items. The limit is enforced on the server.
- **Suggested Catalog entries:** a coin or banknote added manually or imported without a Catalog entry is matched against the Catalog. A candidate is an entry of the same Item type and country whose denomination names the same face value in what could be the same unit (written alike, or read the way denominations sort, §6.2: "1 kroner" is "1 krone", "1 shilling" isn't "1 pound") and whose years include the Item's year; an entry without a year to is still issued. An Item without a country, year or denomination gets no suggestions, and stamps never do. Up to 3 candidates, best first: the denomination written as the Item's, then the entry covering the most years up to the Item's (a general issue before a one-year commemorative), then the latest started.
  - **Item page:** an unlinked Item with a candidate shows a quiet card, "This looks like *1 krone 1958–1972* in the Catalog. Link it?", with **Link** and **Not this**. Linking makes the Item linked to the entry: the facts it holds that the entry says the same of (a denomination of the same face value counts as the same) follow the entry from then on, and the rest stay as the Item's own overrides (ADR 0001). Linking an owned Item takes the entry off the Wantlist, as adding from it does. **Not this** hides that entry for that Item for good (the Item remembers the latest 20 it turned down) and shows the next candidate, if any.
  - **After an import:** when any imported Items have a candidate, the import's success state offers **Link N Items to the Catalog**: a review list with one row per Item and its best candidate, ticked by default, and one confirm that links the ticked ones, each as above. Only the user's own Items are linked.
  - Sets, the Wantlist and "You hold" counts follow the new links. No suggestions while the Catalog is hidden.

### 5.5 Editing, duplicating, deleting
- **Edit** changes any field, photos included. It opens a page of its own, with every field open, Cancel and Save in the bar, and Cmd/Ctrl+Enter to save; on the Item page, **E** opens it, except while typing or with a dialog open. Leaving it with unsaved changes asks first.
  - Its Catalog pill searches the Catalog as when adding (§6.2): picking an entry fills its facts in, and saving links the Item to it, in place of its own entry or for the first time. The facts the person changed are kept, as on a new Item. An owned Item takes the entry off the Wantlist.
- **Set purchase** records a bought lot's purchase on many Items at once, from the Collection's select mode (§7).
- **Duplicate** opens the form prefilled from an existing Item and saves it as a new Item. Photos are not copied unless the user adds them.
- **Delete** requires a confirmation and removes the Item **and its stored photos**.

### 5.6 Photos
- Accepted: JPEG, PNG, WebP or GIF, up to 10 MB. The type is checked from the file's content, not only its name.
- Stored privately and only visible to the owner.
- Each side can be added, replaced or removed independently. A photo opens in a full-screen viewer.
- With each photo the browser also uploads a thumbnail it makes of it: WebP (JPEG in browsers that can't write WebP), at most 256 px on its longest side and never enlarged. Lists, grids, the Overview's latest Items and Album pages show thumbnails; the Item page and the full-screen viewer show the original, which is kept as uploaded. Replacing or removing a photo, or deleting its Item or account, takes its thumbnail with it.
- The list thumbnail is that of the front photo, else of the back photo, else of the first more photo, else a placeholder for the Item type. A photo from before thumbnails shows as itself.

### 5.7 Item detail
- Shows the photos, every descriptive fact that has a value, Grade (with scale), Strike, Quantity, Purchase price, Market value, purchase date and source, notes and Album.
- For gold or silver Items it shows **Metal value = weight × purity × Spot price × Quantity**.
- Actions: edit, duplicate, delete.

## 6. Catalog

### 6.1 Structure
- The Catalog is a tree.
  - **Roots** are countries or **Themes**: groups spanning several countries, such as 2-euro commemoratives or euro banknotes.
  - **A Theme's children** are its countries (2-euro commemoratives › Germany), or its series when its money has no country of its own (euro banknotes › Europa series, whose entries have no country).
  - **Grouping nodes** sit below them (category, denomination, series, and so on).
  - **Leaves** are Catalog entries, which are the only nodes an Item can be created from.
- **A Catalog entry holds:**
  - Item type, title, country, denomination, series, material, Strike
  - metal, weight, fineness, diameter
  - year from and year to
  - technical facts: mint, mint mark (or none), composition, edge and its lettering, thickness, a banknote's width and height, designers, mintage, issue date, and the date it stopped being legal tender
  - technical details, historical notes: in the language of their source, plus translations into the app's languages, each translation credited on its own
  - an image
  - a sort order
- **Every Catalog image and note records** its source, author, licence and link. Attribution is shown wherever the licence requires it.
- **Sourcing (ADR 0003):** CoinsLite builds its own Catalog from sources whose licence allows storing the data:
  - public-domain data, such as US Mint issues
  - official lists that can be reused with attribution, such as the ECB's 2-euro commemoratives
  - official central-bank material, plus our own editing
  - Every stored group of facts records its source. Catalog data of unknown origin is never imported.
- **Images** are shown only where they're clearly permitted: public-domain designs, money that is excluded from copyright, designs whose copyright has expired, and Creative Commons photos of those. Every other entry shows a neutral placeholder until a licence is held.
  - **Banknotes an issuer allows images of under its reproduction rules**, such as the ECB's specimen images of euro banknotes (Decision ECB/2013/10): an image credited as reproduced under that Decision is uploaded, never linked, and stored at no more than 72 dpi at the note's real width and height, so only for an entry that has them.
- **Numista:** an entry may keep its Numista ID as a cross-reference, shown as an attributed link to Numista. No Numista data is stored.

### 6.2 Catalog picker (used when adding Items)
- **Search:**
  - Starts at 2 characters. Matches the chosen Item type's Catalog entries by title, denomination, series or country.
  - Several words match in any order. Results are grouped by country and series, capped at 50, with a prompt to refine.
- **Recently picked:** up to 6 entries per Item type, remembered on the device.
- **Browse:**
  1. Countries and Themes, each with its entry count, sorted by count.
  2. For a Theme: its countries, sorted by entry count, or its series, in order. A Theme's series lists its entries (step 4), as any grouping node does.
  3. Within a country, one of two paths:
     - Walk its grouping nodes, used when the country's entries are organised that way.
     - Or **denomination → series → entries**. Denominations sort by face value, treating minor units (øre, cent, penny…) as hundredths. Series sort by first year. Entries without a series or denomination are grouped explicitly.
  4. **Entry list:** sorted by year, then sort order. Shows years, denomination, metal, weight and fineness, and loads more in pages of 50.
- **Picking an entry** links the new Item to it and fills the descriptive facts.
- **Multi-select (Set mode):**
  - Select several entries, or all the user is missing.
  - Entries already in the Collection are marked with how many the user holds, and stay unselectable unless the user deliberately allows a duplicate.
  - Up to **200** entries per operation.
  - Before adding, the user chooses a target Album and sees their remaining Free plan quota. If the selection exceeds the quota, an upgrade path is offered.
  - Each selected entry becomes **one Item**. The confirmation links to the Collection sorted by newest added, so the new Items come first.

### 6.3 Catalog browsing
- **Browse** the tree with a breadcrumb and back navigation. Every level has its own URL so it can be linked and bookmarked.
- **Search:** across all nodes.
- **Each row shows:** image, title, key facts or child count, country (when it differs from the user's), and how many the user holds.
- **Entry detail:**
  - Image (with attribution), country, denomination, years, series, Strike, material, metal facts, technical facts, historical notes and technical details.
  - How many the user holds.
  - **Quick add:** choose a Quantity and a Grade, then create **one** Item with that Quantity. It respects the Free plan limit and lets the user pick an Album.
- **Admins** can edit an entry directly from its detail view.

### 6.4 Sets
- Any grouping node with more than one Catalog entry below it can be viewed as a **Set**.
- **The Set view:**
  - Lists every entry below the node, grouped by sub-group and sorted by year.
  - Shows completion (held / total and %).
  - Can show everything or only what's missing. Missing-only is the default for large Sets (> 40 entries).
  - A Set lists at most 1,000 entries. A grouping with more is shown as too large to view as one Set, and is viewed through the Sets below it. (No grouping in the Catalog comes close: the largest, the 2-euro commemoratives Theme, has about 600.)
- **Adding from a Set** follows the multi-select rules in §6.2.

## 7. Collection

- **Spot price:** gold and silver, per gram and per troy ounce (31.1034768 g), in the Home currency, with the time of the last update. Refreshes at least every 15 minutes.
- **Totals over the whole Collection** (not the filtered view), each clearly labelled as counting Items or pieces:
  - number of Items; number of pieces per Item type
  - total Purchase price, total Market value, Gain/loss
  - gold and silver Metal value with the total fine weight, shown only when non-zero
- **Charts:**
  - An Item's **Date acquired** is its purchase date, or when it was recorded in CoinsLite if that is earlier or it has no purchase date. Purchase dates before 1900 count as 1900.
  - **Value over time:** what the Collection was worth at the end of each month, from the month its first Item was acquired to now: Purchase price, the latest Market value as of that month, and the Metal value of gold and silver at that month's Spot price. Until its first recorded Market value, an Item with a purchase date counts at its Purchase price; an Item that has never had a Market value adds none. Sold Items leave the series from their sale month.
  - **Value by Date acquired:** cumulative Purchase price and Market value by the month Items were acquired.
  - **Value distribution:** by Item type, plus gold and silver Metal value.
- **Search:** title, denomination, country.
- **Filters:**
  - Item type, plus bullion-only for coins
  - origin: all, the user's own country, or foreign
  - a specific country
  - denomination
  - Grade
  - Album: all, one Album, or without an Album, each with counts
  - from the Overview's Needs attention (§9) only: without a Market value, without any photo, or (coins and banknotes) without a Grade
- **Active filters** are listed and can be cleared one at a time or all at once. Filters and search are reflected in the URL.
- **Sort:** year (oldest first, the default), newest added, oldest added, highest Purchase price, denomination, Grade.
- **Select mode:** select Items one by one, a page or the whole view (up to 200 at once), then act on all of them:
  - move them to an Album, or out of any Album
  - set a Grade, on those whose Item type the Grading scale suits
  - **Set purchase:** Purchase price per piece, purchase date and source, each optional. Only the fields filled in are written, checked as in the Item form; a field left empty keeps each Item's own value. At least one must be filled in.
  - delete them, with a confirmation
  - A move, a Grade or a purchase can be undone from its confirmation while it shows. Items changed since are left as they are, and the confirmation says how many.
- **Views:** list or grid. Page size 15, 25 or 50. The chosen view and page size are remembered on the device.
- **Layout:** the Item list comes first. Search, filters, display and export sit at the top of the page and stay in reach while it scrolls, followed by the active filters. The Spot prices, totals and charts sit in one section between them and the list, which collapses to a one-line summary (Items, total Market value, Gain/loss and any non-zero Metal value). It starts open only on a screen at least 1024 px wide and 1000 px tall, where the list still starts in view below it, and collapsed on anything smaller, such as a phone or a 1280 × 800 laptop; it is then remembered open or collapsed on the device. A search or filter in the URL starts it collapsed. The Overview's totals aren't collapsible.
- **Export (Premium), covering the current filtered view:**
  - **PDF, A4 landscape:**
    - Header: scope, generation time, owner, number of Items, total Purchase price, total Market value, Gain/loss.
    - One row per Item: type, title, year, denomination, Grade, Quantity, purchase date, Purchase price × Quantity, Market value × Quantity, difference.
    - A totals row and page numbers.
  - **CSV:** UTF-8 with BOM, RFC 4180 quoting. Columns: type, title, year, denomination, Grade, Grading scale, Strike, material, country, Quantity, Purchase price, Market value, currency, purchase date, source.

## 8. Albums

- **Create:** name (required, ≤ 80 characters), optional description (≤ 300), and a colour from a fixed palette.
- **Edit:** name, description and colour.
- **List:** each Album with its description and number of Items. Opening an Album shows the Collection filtered to it.
- **Delete:** the user sees the Album's Items and ticks any that should be deleted too, e.g. Items they have sold.
  - Unticked Items stay in the Collection without an Album.
  - The Album itself is always removed.
  - The confirmation states how many Items will be permanently deleted.

## 9. Overview (home)

- **Totals:** number of pieces, total Purchase price, total Market value, Gain/loss.
- **Plan usage** for Free plan users: Items used out of 50, more prominent from 40 Items, with an upgrade path.
- **Add Item:** on phones, a round button in the accent colour in the middle of the tabs along the bottom, on every page, opening the form (§5.4). From tablet width up, the sidebar's Add Item, in the accent colour, is the button for it. While the Collection is empty, the first-run prompt also has a way to add, on every screen size.
- **Value over time:** the Collection's "over time" chart (§7), compact: the same figures, without the switch to Value by Date acquired. Absent while nothing is owned.
- **Latest Items:** the three most recently added, each with thumbnail, year and denomination, and its Market value (× Quantity when more than one) on the right.
- **Set progress:** up to three Sets the user is closest to completing, among the Sets their held Catalog entries open with "View as Set" (§6.4), each with held / total and % as its Set view shows them, and opening it. Closest means the largest share held, then the fewest entries missing. A complete Set isn't listed. Absent when there are none, and while the Catalog is hidden.
- **Needs attention:** how many owned Items have no Market value, how many have no photo (no side photo and no more photos), and how many coins and banknotes have no Grade, each opening the Collection filtered to exactly those Items (§7). A count of none isn't listed; absent when all are none.
- Like the totals, Set progress and Needs attention are worked out a page of Items at a time, so a Collection of any size stays within what one request may read.
- **First-run prompt:** while the Collection is empty, one start card takes the place of the totals and Latest Items, with three ways to start:
  - **Add an Item:** opens the form (§5.4).
  - **Add a whole Set:** opens the Catalog to pick a Set and add what the user owns from it (§6.4). Absent while the Catalog is hidden.
  - **Import a spreadsheet:** opens the CSV import.
  - The empty Collection page offers the same three ways.

## 10. Insurance report (Premium)

- **Scope:** the whole Collection, chosen Albums, and/or Items without an Album.
- **Value columns:** Purchase price, Market value, Metal value, Insured value.
  - Defaults: Purchase price off, the others on.
  - At least one of Purchase price, Market value or Metal value must stay selected.
- **Preview:** piece count, a total for each selected column, and the total Insured value.
- **Per Item:**
  - `qty = Quantity`
  - `purchase = Purchase price × qty`
  - `market = Market value × qty`
  - `metal = weight × purity × Spot price × qty` (gold/silver Items with a weight)
  - `insured = max(selected values)`
- **PDF, A4 landscape, in the active language:**
  - Header: generation time, piece and Item counts, chosen scope, and the owner's name, email, phone and address from their Account.
  - The Spot prices used, when Metal value or Insured value is included.
  - A summary of totals, then one row per Item: type, title, year, denomination, Grade, Quantity and the selected values.
  - A totals row and page numbers.
  - A closing note: values are stated by the owner, Metal value is weight × purity × Spot price, and Insured value is the highest selected value per Item.

## 11. Plans and billing

- **Free plan:** up to **50 Items**, counted as Items, not pieces. After leaving Premium, every Item stays visible and editable, but none can be added while over 50.
- **Premium:** unlimited Items, the Insurance report, and PDF/CSV export.
- **Prices (monthly / yearly):**

| Currency | Monthly | Yearly |
|---|---|---|
| NOK | 39 | 349 |
| EUR (fallback) | 3.49 | 29.99 |
| USD | 3.99 | 34.99 |
| RON | 17.99 | 149.99 |

- **Billing:** through Polar, which picks the currency from the buyer's location and falls back to EUR. Sandbox until launch.
- **Checkout** returns to a confirmation page. Premium activates when the payment provider confirms the subscription.
- **Premium is active** while the subscription is active, trialing or past due and its period hasn't ended. A cancelled subscription stays Premium until the end of the paid period.
- **Manage subscription:** from Account, opening the provider's portal. Shows the plan (monthly/yearly) and the renewal or end date.
- **No ads anywhere.**

## 12. Account

- **Header:** name or email, plan, and renewal or end date.
- **Contact and address:** display name, full name, address, postal code, city, country, phone. Used on the Insurance report.
- **Settings and links:**
  - Home currency (§4)
  - language
  - change email
  - manage subscription, or upgrade
  - Albums
  - Updates, marked when there's an unseen release
  - Insurance report, locked with an upgrade path on the Free plan
- **Send feedback:** a free-text message that reaches the team by email.
- **Sign out.** Delete account sits with the plan, beside Manage subscription (§2).

## 13. Updates

- A versioned list of releases, grouped into new Catalog content, features, improvements and fixes.
- The app stores the last release each user has seen. After a new release, the user is shown its highlights once, with a link to the full list.
- Opening the list marks the latest release as seen.
- New accounts don't see a prompt until the next release.

## 14. Spot prices and exchange rates

- gold-api.com supplies live gold and silver spot prices. MetalpriceAPI supplies currency exchange rates, and backup gold and silver prices at the previous day's close. Both are used under licences that allow commercial use.
- A scheduled job stores the latest spot prices every 15 minutes, and the exchange rates as often as the MetalpriceAPI plan allows, so the cost doesn't grow with the number of users. All conversions use the stored values.

## 15. Administration

- **Access:** admins are users with the admin role. Admin areas are unavailable to everyone else.
- **Catalog editor:**
  - A collapsible tree of every node. Add a root (country or Theme), add a child, edit, delete. Deletion states how many nodes below will go with it.
  - **Editable fields:** every Catalog field, including Item type (coin or banknote), country, metal, weight, fineness, diameter, Strike, the addable flag, sort order, and the image with its attribution.
  - **Images** are converted to WebP: full size (longest side ≤ 800 px) and a thumbnail (≤ 128 px), never upscaled.
  - **An image from Wikimedia Commons:** the admin pastes a Commons file page's address instead of choosing a file.
    - CoinsLite reads the file page's licence templates and categories, not only the API's summary, which often names only the design's licence. It also reads the creator named on the page (not the uploader).
    - **Accepted:** public domain (PD templates, the Public Domain Mark), CC0, CC BY and CC BY-SA. **Refused with a message:** non-commercial (NC), no-derivatives (ND), non-free or fair use, files tagged as missing a licence, source or permission or nominated for deletion, any other licence or copyright notice, or no licence found.
    - **Two licences:** where a file has a CC photo licence and a PD template for its design, the photo's licence governs the credit.
    - **The credit is filled in and stays editable:** source "Wikimedia Commons"; the creator; the licence's name and deed, for example "CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); resized and converted to WebP"; and the file page as the link.
    - The browser downloads the picture and converts it like a chosen file, so it's stored in CoinsLite, never linked to Wikimedia's servers.
    - The dialog reminds the admin that the design must be free too: a free photo doesn't free the design.
- **Catalog CSV export/import:**
  - **Columns:** `id, parent_id, item_type, title, country, denomination, series, material, strike, metal, weight_g, fineness, diameter_mm, year_from, year_to, technical_details, historical_notes, image_url, image_source, image_author, image_licence, sort_order, is_addable`.
  - **Further columns**, all optional: `numista_id`, `image_link`, the source, author, licence and link of the facts and notes (`facts_source` … `notes_link`), the technical facts (`mint, mint_mark, composition, edge, edge_lettering, thickness_mm, width_mm, height_mm, designers, mintage, issue_date, withdrawal_date`), `notes_language` (English when empty), and per app language `technical_details_<lang>, historical_notes_<lang>` with `notes_source_<lang>, notes_author_<lang>, notes_licence_<lang>, notes_link_<lang>`. A file without a column leaves that value as it is.
  - **Import:**
    - Shows how many rows will be inserted or updated before confirming.
    - Updates existing ids, inserts new ones, and allows parent references to other rows in the same file.
    - Rejects rows without a title, reporting the row numbers.
- **Stats:**
  - users: total, new in the last 30 days, Premium, Free
  - subscriptions: active, ending within 30 days, ended
  - Collection: Items, coins, banknotes, stamps, Albums
  - activity: Items added in the last 24 h and 7 days, Albums created in the last 30 days
- **Users:**
  - Search by name or email, filter by plan.
  - Sort by name, email, created, plan, plan end, Items, Albums or last sign-in.
  - A detail view shows profile, account dates, role, subscription and Collection counts.
  - Read-only.
- **Feature flags:**
  - Catalog visibility in navigation.
  - Scanner availability: off, admins only, or Premium beta.

## 16. Scanner (last milestone, behind a flag)

- The user photographs both sides of a coin with on-screen guidance.
- The server suggests the matching Catalog entry, or the descriptive facts if there's no match, using an AI vision model and coin reference data.
- Suggestions open in the add form, clearly marked as suggestions. The user must review them before saving, and the photos come along.
- Starts as a Premium beta. The AI provider is chosen when the milestone starts.

## 17. Open items

- Spot price and exchange-rate providers: gold-api.com supplies live gold and silver, and MetalpriceAPI supplies exchange rates and the backup metal prices. MetalpriceAPI's licence must be confirmed before launch.
- Legal operator for privacy policy, terms and billing: before launch.
- AI provider for the scanner: when that milestone starts.
- Marketing site and guides: written after the app reaches feature completeness.
