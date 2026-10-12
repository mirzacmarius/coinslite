# Catalog data sources for CoinsLite

**Question:** Where can CoinsLite legally get the data to build and expand its **Catalog**, country by country? That covers Catalog entries for coins and banknotes, plus images and market values, in a commercial freemium app with a paid **Premium** plan. What does each source offer, what does it cost, and what do its terms allow?

**Researched:** 2026-10-08. Every claim is tied to a primary source (terms, licence, API docs, pricing page, legislation) listed under [Sources](#sources). Where a primary page could not be opened (bot protection), the claim is labelled *search excerpt* or *secondary*, and should be checked by hand before anyone relies on it.

**Not legal advice.** This is a research brief to hand to counsel. The legal risks are collected in [§9](#9-legal-risks-to-flag).

**Terms** follow `GLOSSARY.md`: Catalog, Catalog entry, Item, Grade, Premium.

---

## 1. Key findings (read this first)

1. **Numista cannot be the stored source of the CoinsLite Catalog under its standard terms.** Its API licence does allow commercial use and display. It also says Licensed Data *"must not be persistently stored, archived or cached"*. Only Numista identifiers may be kept indefinitely, and only issuer/mint/catalogue metadata may be cached, for at most 7 days. The site Terms of Use separately forbid scraping and substantial extraction. Storing Numista data is possible only with a separate written authorisation, which has to be negotiated. ([§3](#3-numista-api-v3))
2. **This clashes with ADR 0001.** Items read their descriptive facts from stored Catalog entries. Those stored facts can't be Numista data unless Numista agrees in writing.
3. **Document the provenance of the existing seed catalog before launch.** For every field and image, record where it came from and under what licence. Content taken from Numista, Colnect, NGC, PCGS or any source with similar terms, without a licence that permits storage, is a contract and database-right risk. Numista identifiers (`numista_id`, `numista_issue_id`) are always fine to keep as cross-references. ([§9](#9-legal-risks-to-flag))
4. **The big reference catalogues changed hands in 2026.** NumisMaster closed on 31 July 2026. NGC and PMG's parent, the Certified Collectibles Group (CCG), bought the NumisMaster pricing database and the KM™ and Pick™ catalogues. None of them has a public API. Licensing now means talking to CCG. ([§5.2](#52-ngc--pmg-ccg-km-and-pick-catalogues-numismaster))
5. **Colnect and PCGS both require written permission for commercial use.** Colnect prices commercial API use "on a per-case basis". PCGS's free API allows 100 calls a day, and its parent's terms forbid commercialising its content. ([§4](#4-colnect), [§5.1](#51-pcgs-public-api-coinfacts-price-guide-auction-prices))
6. **The only off-the-shelf price feed whose terms explicitly allow display in a collection app is Greysheet/CDN's CPG® retail values**, which cover US and some world coins plus The Banknote Book. Values must be labelled and hyperlinked, and cached for no more than 24 hours. Numista's price estimates and sales records can be shown live with attribution, but not stored. ([§7](#7-market-value-and-price-data))
7. **Auction aggregators (CoinArchives, NumisBids, Sixbid, acsearch) forbid automated harvesting or reuse, and eBay's sold-items API is closed to new users.** None of them is usable without a deal. ([§7](#7-market-value-and-price-data))
8. **Open data is too thin to seed a catalogue.** Wikidata has 1 coin item for Norway and none found for Romania. Nomisma is ancient and medieval. The useful official, reusable-with-attribution sources are the ECB's 2-euro commemorative pages, the BNR, Bundesbank data sheets and US Mint production data. They are good for facts and keeping data fresh, but none publishes a structured catalogue. ([§6](#6-open-data-and-official-issuers))
9. **Copyright in the designs themselves differs by country and matters a lot for images.** Romania excludes money from copyright, and US federal designs are mostly public domain. Norway protects its coin designs. For designs from 2018 onward, Norges Bank says consent for commercial use is *"not usually given"*; for older designs, BONO (the artists' rights society) handles permission. German designs are protected. The euro common side may be reproduced flat, while national sides are governed by each member state. Banknote images must also follow anti-counterfeiting rules (≤72 dpi + "SPECIMEN" for euro and Norwegian notes). ([§6.2](#62-wikimedia-commons-and-the-copyright-status-of-designs), [§8](#8-recommendation))
10. **For Norway, the natural licensing partner is Samlerhuset.** It owns Samlerforlaget Norges Mynter, publisher of *Norges Mynter*, the leading Norwegian coin catalogue (1814 to today, with grade prices and mintages, print and norgesmynter.no). It also owns Det Norske Myntverket, the Norwegian mint. No API or public licence is published. ([§10](#10-norway-specific-sources))

---

## 2. Summary table

Verdict key: **Allowed**, **Allowed w/ attribution**, **Paid licence** (a published paid route exists), **Written licence** (must be negotiated), **Not allowed**, **Unclear**.

| Source | Offers | Access | Cost | Limits | Commercial verdict |
|---|---|---|---|---|---|
| Numista API v3 | ~548k types / ~978k varieties: coins, banknotes, exonumia; specs, issues and mintages, images with credits, grade price estimates, sales records | REST API (key + OAuth) | Free: 2,000 req/month. Paid: €100 activation, €100/month minimum, €0.015 per search, €0.01 per sales-records call | 10 concurrent; ≤15 type-detail calls per successful search | **Display: allowed w/ attribution** (N# + "Numista"). **Storing: not allowed** beyond IDs and 7-day metadata cache. **Storing with permission: written licence** |
| Numista website | Same catalogue | Scraping forbidden | – | – | **Not allowed** (extraction and scraping prohibited) |
| Colnect CAPI | ~208k coins, ~174k banknotes | REST API (key on application) | Free for non-commercial; commercial "per-case" | Revocable | **Written licence** |
| PCGS Public API | US-centred CoinFacts by PCGS# + grade (specs, mintage, price guide value, population, auction results), cert lookups, banknotes | REST (OAuth, PCGS account) | Free | **100 calls/day** (more on request) | **Written licence** (Collectors Universe terms forbid commercialising content) |
| NGC / PMG (CCG): World Coin & World Paper Money price guides, KM & Pick | KM- and Pick-numbered catalogue with specs, images, values by grade | Website only; no public API found | Free to view | – | **Written licence** (terms: personal, non-commercial; *search excerpt*) |
| NumisMaster / Krause SCWC | – | **Closed 31 Jul 2026**; data now with NGC/PMG | – | – | n/a |
| Greysheet / CDN CPG API | US coins, world coins, currency, Banknote Book; CPG retail + wholesale prices; cross-refs to PCGS#, NGC ID, KM, Pick | REST API | Dealer subscription ($30+/mo) + API ($19 / 10k calls Basic; $25/month minimum) | Cache ≤24 h | **CPG retail values: allowed w/ attribution + hyperlink** in collection tools; wholesale not on public sites |
| Wikidata | CC0 structured data; negligible coin-issue coverage | SPARQL, dumps | Free | – | **Allowed** (CC0) |
| Wikimedia Commons | Coin/banknote photos | API, dumps | Free | – | **Allowed per file licence** (attribution, share-alike), subject to design copyright |
| Nomisma.org | Ancient/medieval linked data | SPARQL, dumps | Free | – | **Allowed w/ attribution** (CC BY 3.0; datasets mostly ODbL); off-scope |
| ECB 2-euro commemoratives | Country, feature, description, volume, date, image | HTML pages | Free | – | **Text: allowed w/ attribution**. Images: unclear (national-side rights) |
| Norges Bank | Series pages, withdrawn notes/coins, reproduction rules | HTML | Free | – | **Text: allowed w/ attribution**. Designs: consent needed |
| US Mint | Production figures (monthly CSV), image library, design-use policies | HTML/CSV | Free | – | Federal works not copyrighted in US, but site terms restrict commercial use; design-use policy allows listed designs with credit |
| Monnaie de Paris | Product pages | HTML | – | TDM reserved | **Not allowed** without written authorisation |
| Banque de France | Banknote reproduction rules | HTML | – | – | Images per ECB rules; other content needs authorisation (*search excerpt*) |
| BNR (Romania) | Issue pages, numismatic issues | HTML | Free | – | **Allowed w/ attribution** (+ tell paying users it's free at bnr.ro) |
| Deutsche Bundesbank | Collector-coin data sheets (PDF, mintages), picture archive | HTML/PDF; images on request | Free | – | **Text: allowed w/ attribution**. Site images: editorial/educational only. Numismatic archive images: on request |
| Perth Mint | Product pages | HTML | – | – | **Written licence** |
| DigitaltMuseum (NO) | Museum objects incl. coins/notes | API (key via KulturIT) | Free | – | **Per-object licence** (use CC0/BY/BY-SA, skip NC/"contact owner") |
| *Norges Mynter* (Samlerforlaget) | Norwegian coins 1814–today, specs, mintages, grade prices | Print + norgesmynter.no (login) | – | – | **Written licence** (© notice; no terms or API published) |
| BanknoteDB.com (IBNS-linked) | Collaborative banknote DB (Pick, TBB numbers) | Website | – | – | **Unclear** (no terms found) |
| banknote.ws | Banknote images | Website (TLS error on 2026-10-08) | – | – | **Unclear** |
| CoinArchives Pro | 10M+ auction records | Subscription website | US$600/yr | No automated harvesting | **Not allowed** |
| NumisBids / Sixbid / acsearch | Auction lots, results | Website | – | No scraping/reuse | **Not allowed** |
| eBay Marketplace Insights | Sold-item history | API | – | "not open to new users" | **Not available** |

---

## 3. Numista (API v3)

### What it offers
- **Coverage:** the catalogue page reports *"978 185 varieties for 548 415 types"*. The API covers *"the Numista catalogue of coins, banknotes and exonumia"* (API docs v3.36.1).
- **Type fields** (`GET /types/{id}`): title, object type, issuer, issuing entity, min/max year, face value (text, numeric value, currency), ruler(s), demonetisation, shape, composition (e.g. *"Silver (.925)"*), technique, weight (g), size/diameter (mm), size2, thickness (mm), orientation, obverse/reverse/edge/watermark (description, lettering, translation, engravers/designers, `picture`, `thumbnail`, `picture_copyright`, `picture_copyright_url`, `picture_license_name`, `picture_license_url`), mints, printers (for banknotes), series, commemorated topic, comments (HTML), related types, tags, and **references in other catalogues** (KM, Pick and so on).
- **Issue fields** (`GET /types/{id}/issues`): year as written and Gregorian year, mint letter, marks, banknote signatures, **mintage**, references, comment. This maps one-to-one onto a CoinsLite Catalog entry ("2 øre 1918").
- **Prices:** `GET /types/{id}/issues/{issue_id}/prices` gives *"estimates for the price of an issue, depending on the grade"* in any ISO 4217 currency. Grade enum: `g, vg, f, vf, xf, au, unc`. `GET /types/{id}/sales_records` returns past sales.
- **Search by image** (`POST /search_by_image`, paid only), with an experimental year/grade guess. This is relevant to any future photo-identification feature.
- **Images:** picture URLs plus per-side credit and licence fields. The `picture_license_*` fields were fixed in the docs on 16 May 2024 (Numista forum, topic145333). Many images are credited to third parties (examples in the docs: "Heritage Auctions", "ECB").
- Mints carry `nomisma_id` and `wikidata_id`, which helps cross-referencing.

### Access, cost, limits ([pricing](https://en.numista.com/api/pricing.php), [licence](https://en.numista.com/api/license.php))
- **Free Plan:** *"Up to 2000 API requests per calendar month"*, all endpoints except search by image. Positioned *"for development, testing and small personal projects"*.
- **Paid Plan:** *"Activation fee: €100 excluding VAT, charged once"* and *"Monthly minimum: €100 excluding VAT, except during the first calendar month."*
  - Normal search: €0.015 for the first 20k, €0.012 up to 50k, €0.009 above. Search by image: €0.030 / €0.024 / €0.018. Only page 1 of a search is billed.
  - Sales records: *"€0.010 per request"* (no charge if there are no records).
  - Type detail, issues, prices and other calls are not individually charged, but *"no more than 15 Type Detail Requests may be made for each successful Normal Search or Search by Image request"* (cumulative per month).
  - *"An account may have no more than 10 API requests being processed simultaneously."*
  - French VAT (20%) applies unless you are a company outside France with VAT details.
- **Rough cost for CoinsLite** if Numista is used as a live lookup: 50,000 Catalog-entry views a month need ≥3,334 searches (50,000 ÷ 15) ≈ €50, so the €100 minimum applies. Price is not the problem. Storage is.

### Terms for commercial apps: verbatim
Licence grant (§3, [license.php](https://en.numista.com/api/license.php)):
> "Numista grants the Licensee a non-exclusive, worldwide, revocable, non-transferable and non-sublicensable licence to: access and use the API; retrieve Licensed Data; use Licensed Data for personal, research, educational, internal or commercial purposes; display Licensed Data in applications, websites and services; and create analyses, classifications and other functionality using API responses."
>
> "the Licensee may not: give End Users direct access to the Numista API; disclose API Credentials; provide a bulk download of Licensed Data; provide an API or data feed containing Licensed Data; or sublicense the API or Licensed Data."

Attribution (§4):
> "Applications displaying catalogue search results obtained through the API must clearly display the N# identifier for each result." … "Applications using Licensed Data must clearly identify "Numista" as the source. Suitable wording includes: "Source: Numista"; or "Data provided by Numista"." … "Where an API response includes a third-party source, copyright or attribution notice, the Licensee must preserve and display that notice where reasonably required."

Storage and caching (§8). This is the decisive clause:
> "8.1 … Except where expressly allowed below or authorised by Numista in writing, Licensed Data must not be persistently stored, archived or cached. The Licensee may not create or maintain a complete or substantial copy of the Numista catalogue."
>
> "8.2 Numista identifiers, including N# identifiers and identifiers of issuers, mints and catalogues, may be stored without a time limit. The Licensee may associate these identifiers with records in its own systems."
>
> "8.3 Catalogue Metadata may be cached for up to seven days after retrieval."

"Catalogue Metadata" means only the issuers, mints and catalogues endpoints (§1). The 8.4 Personal Projects exception explicitly excludes *"using the stored data to operate a commercial or publicly available service."*

Prohibited uses (§11) include *"use storage or caching primarily to avoid API requests or charges"* and *"systematically retrieve data to reproduce or replace the Numista catalogue"*. Numista may change the API or the terms with 30 days' notice (§12, §17). After termination you must delete Licensed Data but may keep identifiers (§14). §20 says *"A separate written agreement takes priority in the event of conflict"*: this is the route to a bespoke storage licence.

Website Terms of Use ([conditions.php](https://en.numista.com/conditions.php), version of 3 January 2023), §12.2:
> "the Operator expressly forbids: The extraction, by permanent or temporary transfer of all or a qualitatively or quantitatively substantial part of the content of its database on another medium … Reproduction, extraction or reuse, by any means, including methods similar to scrapping of content (photographs, descriptions, etc.) published by the Operator or by a Collector."

The ToU also bar scraping by reference to the French Criminal Code (Art. 323-1 et seq.).

### Verdict
- **Live display in a commercial app: allowed with attribution.** Show N# next to each search result, credit "Numista", and keep each image's credit/licence.
- **Storing Numista data in the CoinsLite Catalog: not allowed** under the standard terms, on either plan. Store N#/issue IDs only.
- **Paid commercial licence for storage: no published product.** You'd have to negotiate a written authorisation under §8.1/§20 (contact@numista.com).
- **Scraping: not allowed.**
- **Questions to put to Numista in writing:**
  - Can a Premium insurance report or CSV export include Numista-sourced titles or values? That might count as a "bulk download".
  - Can a user's Item keep a snapshot of a Numista price estimate?
  - May CoinsLite store CC-licensed images found through Numista under their own CC licence? Obtaining them through the API is still governed by the contract.

---

## 4. Colnect

- **Offers:** a collaborative catalogue with *"207,998 Coins"* and *"173,821 Banknotes"* (catalogue pages, 2026-10-08), plus many other collectibles.
- **Access:** CAPI at `https://api.colnect.net`, with an API key granted on application and HMAC headers (`Capi-Timestamp`, `Capi-Hash`). The spec is a downloadable .docx behind bot protection, not reviewed.
- **Cost:** [CAPI page](https://colnect.com/en/help/collecting/colnect_api): *"CAPI is free for non-commercial use, and otherwise pricing is determined on a per-case basis."*
- **Terms** ([Terms of Service](https://colnect.com/en/help/collecting/terms_of_service)):
  > "D. You agree not to use the Website for any commercial use, without the prior written authorization of Colnect."
  >
  > "Content on the Website is provided to you AS IS for your information and personal use only and may not be downloaded, copied, reproduced, distributed … without the prior written consent of the respective owners."
  >
  > CAPI: "B. You may only access CAPI with prior written permission, hereby the "license", and only for the goals you have provided in the request you have made." … "E. Unless specifically mentioned, Colnect owns all rights to content extracted from Colnect … You are not allowed to provide third parties with access to such content in any means other than the ones described in your CAPI access request. When your CAPI usage license is revoked, you should immediately delete all such content."

  Automated access beyond human request rates is forbidden (§F).
- **Verdict: written licence (paid, per case).** Worth asking for a quote as an alternative or complement to Numista, especially on whether storage is allowed. The licence is revocable, and content must be deleted when it ends, so it is a weak foundation for an owned Catalog.

---

## 5. Grading services and catalogue publishers

### 5.1 PCGS (Public API, CoinFacts, Price Guide, Auction Prices)
- **Offers** ([swagger](https://api.pcgs.com/publicapi/swagger/ui/index)):
  - `GetCoinFactsByGrade` (PCGS# + grade) returns Name, Year, Denomination, **Mintage**, MintMark, MintLocation, MetalContent, Diameter, Edge, Weight, Country, Designer, **PriceGuideValue**, Population/PopHigher, Images, varieties, SeriesName, and an `AuctionList` (auctioneer, date, price, lot URL).
  - There are also cert-number and barcode lookups, Auction Prices Realized (APR) endpoints and banknote endpoints.
  - Strongest for US coins (Morgan/Peace dollars).
- **Access/limits** ([docs](https://www.pcgs.com/publicapi/documentation)): you need a PCGS account and a bearer token. *"There is a daily limit of 100 API calls. If you would like to request a larger daily limit, please contact us via email: apis@pcgs.com."* The page links a "PCGS API End User Agreement" that isn't visible without logging in.
- **Terms** ([Collectors Universe User Agreement](https://www.collectors.com/Home/TermsOfUse), which applies to PCGS as a division). Users will not:
  > "use any robot, spider, scraper or other automated means to access our Services for any purpose; … reproduce, perform, display, distribute … content that belongs to or is licensed to Collectors Universe … except with prior express permission … ; commercialize any Collectors Universe application or any information or software associated with such application"
- **Verdict: written licence.** Use the API only for development until PCGS (apis@pcgs.com) confirms in writing that commercial display and storage are allowed, with volume terms. 100 calls a day can't support a catalogue.

### 5.2 NGC / PMG (CCG), KM and Pick catalogues, NumisMaster
- **2026 ownership changes:**
  - NumisMaster.com: *"NumisMaster.com permanently ceased operations on July 31, 2026."* Pricing data is *"now available through the World Coin Price Guide at NGCCoin.com and the World Paper Money Price Guide at PMGnotes.com, the new owners of the NumisMaster pricing data"* ([numismaster.com redirect](https://www.numismaticnews.net/pricing)).
  - AIM's publisher: *"we have sold the NumisMaster pricing database to NGC and PMG"* ([publisher's note](https://www.numismaticnews.net/a-note-from-the-publisher-of-numismatic-news-world-coin-news-and-bank-note-reporter)).
  - CCG press release (reprinted in [E-Sylum v29 n27, 2026](https://www.coinbooks.org/v29/esylum_v29n27a07.html)): *"The Certified Collectibles Group, whose companies include NGC® and PMG®, is proud to announce that it has acquired the KM™ and Pick™ catalogs"*, which *"aim to assign a reference number to every collectible in existence and provide associated images, specifications data such as mintage and design details, and valuation information by grade."* It continues: *"NGC makes the KM catalog available for free … through its World Coin Price Guide … PMG also makes the Pick catalog available for free through its World Paper Money Price Guide."*
  - The printed *Standard Catalog of World Coins* went to Penguin Random House, with no new editions reported (E-Sylum v24 n4, 2021).
- **API:** no public NGC/PMG data API found. The only NGC API found is a dealer submission-tracking API (*search excerpt*).
- **Terms:** ngccoin.com/pmgnotes.com block automated retrieval, so the wording below comes from a *search excerpt* of [ngccoin.com/legal/terms-of-use](https://www.ngccoin.com/legal/terms-of-use/) and needs checking by hand: *"You may view, copy, print out, and use content gathered from the Website solely for your personal use, provided that (1) the content available from the Website is used for informational and non-commercial purposes only …"*. The NGC price-guide disclaimer (*search excerpt*) says prices *"are averages, not specific prices for individual coins"* and *"are only updated from time to time"*.
- **Verdict: written licence.** CCG now controls the KM and Pick systems, the world price guides and their images. It's the obvious party to approach for a world-coin and world-banknote data licence, and it has said it plans to invest in *"accessible"* databases. Do not scrape.
- **KM/Pick numbers as references:** Citing a catalogue number next to a Catalog entry is common practice, and a single number is a fact. Bulk-copying the numbering together with catalogue content needs a licence, and getting KM numbers through Numista's API doesn't permit storing them (Numista §8.1). **Unclear; ask CCG.**

### 5.3 Greysheet / CDN (Whitman Brands): CPG® API
Covered in [§7](#7-market-value-and-price-data). It's primarily a price source, but its catalogue has *"cross-references to other industry standards like PCGS#, NGCID, Krause, Friedberg, and Pick"* ([usage guide](https://www.greysheet.com/cms/1049/cdn-public-api-v2-usage-guide)).

---

## 6. Open data and official issuers

### 6.1 Wikidata
- **Licence:** *"All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under"* CC0 ([Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)).
- **Coverage, measured:** a SPARQL count (items that are an instance or subclass of *coin*, Q41207, with country P17) on 2026-10-08 returned France 223, United States 24, Germany 15, **Norway 1**, and **no row for Romania**.
- **Verdict: allowed (CC0), but useless for issue-level seeding.** Good for linking issuers, mints and rulers (Numista mints carry `wikidata_id`).

### 6.2 Wikimedia Commons and the copyright status of designs
- **Licence:** per file. *"Each media file has its licensing specified on its file description page."* Some licences require attribution of *"the original creator"* and share-alike for modifications ([reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)).
- **Design copyright by country** (summary of [Commons:Currency](https://commons.wikimedia.org/wiki/Commons:Currency), checked against primary sources where noted):

| Country / area | Coins & notes on Commons | Basis |
|---|---|---|
| Norway | **Not OK** | Designs protected by copyright; Norges Bank administers the rights (primary: [Norges Bank guidelines](https://www.norges-bank.no/en/topics/notes-and-coins/rules-regulations/Guidelines-banknote-coin-designs/), below) |
| Romania | **OK** | Law 8/1996 art. 9: *"Nu pot beneficia de protecția legală a dreptului de autor următoarele: … d) mijloacele de plată"* ("means of payment are not protected by copyright"; primary: [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/221527), republished MO 489/2018) |
| France (franc) | **OK** | Court of Cassation, 5 Feb 2002: copyright exists but is "paralysed" by public-service purpose |
| Germany | **Not OK** (except DM notes) | Banknotes and coins are not free government works |
| Euro common sides | **OK, flat reproductions** | Commission communication COM(2001) 600 (primary, below) |
| Euro national sides (incl. 2-euro commemoratives) | **Per member state** | *"Copyright of the national side of the coin is determined by the individual Member States"* |
| United States | Coins mixed; notes OK with size conditions | Federal works are public domain. Some designs were assigned by third parties. Banknote images must be <75% or >150% of size, one-sided (18 U.S.C. § 504) |
| Australia | Not OK for designs from 1 May 1969 on | (Perth Mint Lunar is post-1969) |

- **Verdict:** **allowed per file licence**, but a free licence on a photo doesn't override copyright in the design. Few modern Norwegian or German coin images will be on Commons for exactly that reason.
- Under EU DSM Directive art. 14, reproductions of public-domain visual art aren't protected *"unless the material resulting from that act of reproduction is original"*. Photos of three-dimensional coins may still be original, so treat them as copyrighted unless licensed.

### 6.3 Nomisma.org
- *"Unless specified otherwise, content in Nomisma.org is licensed under a Creative Commons Attribution 3.0 License."* SPARQL and bulk dumps are available.
- The partner type corpora are ancient and medieval (OCRE, CRRO, PELLA …; OSCAR covers Swiss coins "medieval to modern"). They're mostly ODC-ODbL, and Corpus Nummorum is CC BY-NC-SA ([datasets](https://nomisma.org/datasets)).
- **Verdict:** allowed with attribution (share-alike for ODbL). Not useful for Norway, France, Romania or Germany modern issues; useful only as a vocabulary for mints and denominations.

### 6.4 ECB and European Commission: 2-euro commemoratives
- **Offers:** year pages from 2004 to 2025 ([index](https://www.ecb.europa.eu/euro/coins/comm/html/index.en.html)). Each coin shows an image, **country, feature, description, issuing volume and issuing date** (e.g. Monaco 2025, "Marquisat des Baux", "15 000 coins", "November 2025"). HTML only; no CSV/JSON.
- **ECB copyright** ([disclaimer](https://www.ecb.europa.eu/services/disclaimer/html/index.en.html)): free use of information *"it must appear accurately and the ECB must be cited as the source"*. If the information appears in sold products, buyers must be told it is available free from the ECB, and any modification must be stated.
- **Euro coin common side** (primary: [COM(2001) 600](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52001DC0600)):
  > "Reproduction of all or part of the common face design of the euro coins is authorised without recourse to a specific procedure in the following cases: for photographs, drawings, paintings, films, images, and generally reproductions in flat format (without relief) provided they are in faithful likeness and are used in ways which do not damage or detract from the image of the euro."
- **Verdict:** the facts and text are **allowed with attribution** (ECB). It's the best authoritative seed for the 2-euro commemorative series. Showing a commemorative's national side is **unclear**: the rights sit with each member state, and the ECB's text licence doesn't obviously extend to them.
- **Titles in CoinsLite's bundled dataset:** each coin's title comes from the ECB's page in the issuing country's language. Where a country has several official languages (Belgium, Cyprus, Finland, Luxembourg, Malta, Ireland) or one the ECB doesn't publish in (Andorra), the title stays in the ECB's English, since picking one of the languages would be CoinsLite's choice rather than the source's.

### 6.5 Norges Bank
- **Offers:** HTML pages on current and withdrawn banknote series (I–VII) and coins (e.g. which withdrawn notes and coins can still be exchanged). No structured catalogue.
- **Website text** ([disclaimer](https://www.norges-bank.no/en/disclaimer/)): *"copies … may be made of material on this website, provided that Norges Bank is quoted as the source"*. Conditions: *"No changes may be made in the contents of the material"* and *"Inline liking methods are prohibited ("frames")"*, *"the special rules that apply to reproduction of banknotes"*.
- **Design copyright** ([guidelines](https://www.norges-bank.no/en/topics/notes-and-coins/rules-regulations/Guidelines-banknote-coin-designs/)):
  > "3.1 … up to and including banknote series VII and for commemorative coins issued prior to 2018: The copyright is owned partly by Norges Bank and partly by the artist … The copyright expires 70 years after the artist's death. The right to modify or use all or part of a banknote and coin design in a context other than ordinary use by the central bank requires the prior consent of the copyright holder. The Norwegian Visual Artists Copyright Society (BONO) handles copyright matters on behalf of visual artists."
  >
  > "3.2 … banknote series VIII and new coin designs as from 2018: Norges Bank holds all rights … Such consent is not usually given if the banknote and coin design is intended for use in a commercial context."
- **Banknote images online:** files at most 72 dpi, and *"the word "SPECIMEN" must be clearly printed diagonally across the reproduction"* covering ≥50% of the diagonal, with letters ≥15% of the note's height.
- The guidelines still cite the 1961 Copyright Act, which the 2018 Act has replaced. Ask Norwegian counsel which exceptions might cover catalogue thumbnails.
- **Verdict:** **text: allowed with attribution.** **Design images: consent required** (BONO for older designs, still in copyright until 70 years after the artist's death; Norges Bank for 2018+ designs, where commercial consent is usually refused).

### 6.6 US Mint
- **Data:** monthly circulating-coin production figures by denomination and programme, in HTML and CSV (*search excerpt*; the page sits behind bot protection). Historic mintages for Morgan/Peace dollars are on the Mint's history pages (not reviewed).
- **Terms** ([Terms of Use](https://www.usmint.gov/resources/terms-of-use)):
  > "This Web site contains data and works prepared by officers or employees of the United States Government as part of their official duties that are not covered by copyright in the United States. However, you should not assume anything on this Web site is necessarily in the public domain." … "Coin and medal designs may be based on sources that are copyrighted and licensed to the United States Mint … Reuse of such designs may require permission of the rights owner." … "2. Commercial use: You may not use this Web site for trading, sales or commercial purposes other than for making purchases from the United States Mint."

  18 U.S.C. § 709 restricts using "United States Mint" in a way that implies endorsement.
- **Design use policy** (*search excerpt*): allows listed circulating designs, crediting *"United States Mint image"*.
- **Verdict:** facts (mintages) are usable. Morgan (1878–1921) and Peace (1921–1935) dollar designs are long in the public domain. Use your own or properly licensed photos. Mint images are **allowed with attribution** only for designs the policy lists.

### 6.7 Monnaie de Paris and Banque de France
- **Monnaie de Paris** ([mentions légales](https://www.monnaiedeparis.fr/fr/mentions-legales)):
  > "Toute extraction, reproduction, représentation, modification, adaptation, opération de fouille de textes et de données par des dispositifs de collecte automatisée de données, y compris par des programmes basés sur l'intelligence artificielle, réalisées sans l'autorisation préalable et écrite de La Monnaie de Paris sont strictement interdites"

  ("Any extraction, reproduction, … text and data mining by automated collection … without the prior written authorisation of La Monnaie de Paris is strictly prohibited.") **Verdict: not allowed without written authorisation.** Modern French collector coins can also carry third-party IP: Colnect lists a 2026 "Disney Animation Classics" €10 proof set.
- **Banque de France:** the site blocked automated access. Per a *search excerpt* of its banknote-reproduction page, banknote images follow ECB rules (SPECIMEN, ≤72 dpi), and other site content needs written authorisation. **Verdict: unclear / authorisation required.** No structured data found.
- **Euro banknotes, all countries** (primary: [ECB/2013/10, Art. 2(3)–(4)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32013D0010)): online reproductions are lawful if *"the word SPECIMEN (sample) is incorporated diagonally across the reproduction … and the resolution of the electronic reproduction in its 100 % size does not exceed 72 dots per inch (dpi)"*, with SPECIMEN ≥75% of the length and ≥15% of the width, opaque and contrasting. Alternatives are one-sided images at ≤75% or ≥125% size. Art. 2(6): the rules also apply to withdrawn euro banknotes.

### 6.8 Banca Națională a României (BNR)
- **Offers:** pages on banknotes and coins in circulation, commemorative issues, withdrawn issues and numismatic issues (`/2638-emisiuni-numismatice`). These render client-side, so content wasn't captured. No structured catalogue found.
- **Terms** ([Termeni și condiții](https://www.bnr.ro/2281-termeni-si-conditii)):
  > "Redistribuirea sub orice formă şi prin orice mijloace a conţinutului informațional este permisă numai cu indicarea sursei. … În cazul în care scopul preluării informațiilor îl constituie furnizarea unor servicii contra cost …, clienţii finali vor fi înștiințați că informațiile sunt preluate din website-ul BNR, unde sunt accesibile în mod gratuit."

  ("Redistribution in any form is allowed only with the source indicated … if used for paid services, end clients must be told the information comes from the BNR website, where it is free.") Third-party stock photos on the site are excluded.
- **Verdict: allowed with attribution**, plus the "free at bnr.ro" notice for Premium. Combined with Romania's copyright exclusion for means of payment, Romania is the most image-friendly launch country. Two questions remain: whether non-circulating collector coins count as "mijloace de plată" (means of payment), and who owns the copyright in the photographs. **Ask counsel.**

### 6.9 Deutsche Bundesbank
- **Data:** collector-coin programme pages and PDF data sheets listing motif, mint letter, issue date and mintage (e.g. the €10/€20 series, dealer order deadlines through 2027), per a *search excerpt* of [collector coins](https://bundesbank.de/en/tasks/cash-management/euro-coins/collector-coins).
- **Terms** ([conditions of use](https://www.bundesbank.de/en/homepage/user-information/conditions-for-the-general-use-of-the-website-764706)):
  > "Any of the uses listed above forwarding and reproduction of information produced by the Deutsche Bundesbank must cite the following: "Source: Deutsche Bundesbank"." … "as a matter of policy, the download, republication, retransmission, reproduction, or any other use of all images and videos on the Bundesbank's website as an independent file without the consent of the copyright owners is prohibited." … downloadable images "may only be used for editorial, educational or private purposes … Any further use for commercial purposes, in particular for advertising, is not permitted."
- **Numismatic picture archive** ([page](https://www.bundesbank.de/en/bundesbank/numismatics/pictures-archive/pictures-archive-of-german-notes-and-coins-616482)): *"The Bundesbank provides publishable digital images of coins, banknotes and other collection items free of charge upon request, provided they are free of any third-party rights"* (numismatik@bundesbank.de), with the credit *"Numismatic Collection Deutsche Bundesbank, Frankfurt am Main, inv. No"*.
- **Medals and look-alikes:** Germany's Coinage Act §11 and Council Regulation 2182/2004 restrict medals and tokens resembling coins ([reproduction regulations](https://www.bundesbank.de/en/tasks/cash-management/reproduction-regulations/regulations-concerning-the-protection-of-banknotes-and-coins-623820)). This matters only for physical products.
- **Verdict:** **text and data: allowed with attribution.** **Website images: no commercial use.** **Archive images: ask** whether a commercial catalogue counts as "publishable".

### 6.10 Perth Mint (existing Australian Lunar entries)
- [Terms](https://www.perthmint.com/terms-and-conditions/): *"no part of the Websites or its content may be copied, reproduced, licensed, published or otherwise exploited for any commercial purposes without the prior written permission of The Perth Mint"*.
- **Verdict: written licence** for images. Facts such as weight, fineness and mintage are individually unprotected, but the existing Lunar Catalog entries' images need provenance checks.

### 6.11 Museums (images with open licences)
- **DigitaltMuseum (Norway)** ([terms](https://dok.digitaltmuseum.org/en/terms-of-use)): *"The license applied to the objects determines the legal right to (re)distribute the content."* Works where rights are held through BONO require *"an agreement with BONO"*. Licences are set per object.
- **Verdict:** allowed per object where the licence is CC0, CC BY or CC BY-SA and the design is out of copyright. Useful for older Norwegian coins and notes (e.g. pre-1900 skilling and speciedaler). The API needs a key from KulturIT (*secondary*).

---

## 7. Market value and price data

In CoinsLite, an Item's market value is entered by its owner, and the insurance report uses owner-stated values plus metal value at spot. So a price feed is an enhancement, not a launch requirement. CoinsLite's Norwegian Grade scale (2, 1-, 1, 1+, 01, 0/01, 0, BU, Proof) has to be mapped to each source's scale (Numista: g…unc; Sheldon 1–70 for PCGS, NGC and Greysheet).

| Source | Data | Access | Commercial verdict (quote) |
|---|---|---|---|
| **Numista** prices + sales records | Estimates by grade (g…unc) in any currency; past sales | API: prices not individually charged; sales €0.01/call | **Allowed w/ attribution, live only.** No storing (§8.1), so valuations must be computed per request. Ask whether a stored valuation snapshot is allowed |
| **Greysheet / CDN CPG® API** | CPG retail (Basic); + Greysheet/Bluesheet/Greensheet wholesale (Advanced); US & world coins, currency, Banknote Book | Dealer subscription (Coin Dealer Digital $30/mo; Dealer+ $56/mo for Advanced) + API: Basic $19 (10k calls) … $95 (50k) … $1,893 (1M); Advanced $57 … $287 … $5,737; *"minimum monthly charge of $25"* | **Allowed w/ attribution** for retail: *"4.4. CPG Retail Pricing Values: May be used in front-facing websites or collection management tools provided values are properly labeled as sourced from CDN (e.g., 'CPG Price (or Value)', 'Red Book Price (or Value)', 'Banknote Book', or 'Friedberg'). Displayed values must be hyperlinked to CDN."* Wholesale: *"not permitted on any public websites without CDN's prior written permission"* (4.3). Caching: *"Internal caching for up to 24 hours is permitted"* (7.2). Also *"7.1. Licensee will not directly compete with CDN"* and §5.4: remove data within 30 business days of termination |
| **PCGS** Price Guide / APR | Price guide value by grade; auction results (US-centric) | API, 100/day | **Written licence** (see §5.1) |
| **NGC / PMG** world price guides | KM/Pick values by grade | Website only | **Written licence** (see §5.2) |
| ***Norges Mynter*** | Norwegian dealer retail prices across grades, updated continuously online | Print + norgesmynter.no | **Written licence** (see §10) |
| **CoinArchives Pro** | 10M+ auction records from 150+ houses; US$600 / 12 months | Website subscription | **Not allowed:** *"Information accessed from the Service may not be stored or harvested using automated means."* … *"Access to the Service may not be sublicensed or otherwise re-sold."* |
| **NumisBids** | Live auctions/results | Website | **Not allowed:** *"Information accessed from the Service may not be stored or harvested using automated means."* |
| **Sixbid** | Auctions | Website | **Not allowed:** *"Any other use of the site, including the reproduction, modification, distribution, transmission or display of the content, is strictly prohibited."* (terms last modified 26 Mar 2007) |
| **acsearch.info** | Auction research database | Website (premium) | **Not allowed:** forbids *"web scrapers, web robots and other software for the systematic collection of data"* and copying content *"without prior agreement from acsearch and the respective creator"* |
| **eBay Marketplace Insights** | Sold-item history | Buy API | **Not available:** *"The Marketplace Insights API is restricted and not open to new users at this time."* Buy APIs in production are *"intended for eBay partners only"*, and *"Acceptance of applications is based on the proposed business model."* |

---

## 8. Recommendation

### Guiding decision
**CoinsLite should own its Catalog.** ADR 0001 needs stored facts on each Catalog entry, and that is only safe if every stored field and image has a source whose licence allows storage. Each Catalog entry should keep provenance: a source and licence per field group and per image. External identifiers (`numista_id`, `numista_issue_id`, KM, Pick, PCGS#, GSID) are kept only as **cross-references**. Treat Numista as an optional live-enrichment and identification layer, not as the store.

### (a) Seeding a new country's Catalog
1. **Start from official issuers and treat it as editorial work.** Use the ECB pages (2-euro), BNR (Romania), Bundesbank data sheets (Germany), Norges Bank series pages and *Norges Mynter* (Norway, if licensed) and US Mint production data (US). Cite each one as the terms require: "Source: ECB", "Source: Deutsche Bundesbank", "Kilde: Norges Bank", BNR plus the free-at-bnr.ro notice. Individual facts (weight, diameter, mintage) are not copyrightable. Don't copy a substantial part of any single protected database. The EU sui generis right covers *"extraction and/or re-utilization of the whole or of a substantial part"* and *"repeated and systematic extraction … of insubstantial parts"* (Directive 96/9/EC art. 7(1), 7(5)).
2. **License a national catalogue where one dominates.**
   - Norway: approach Samlerhuset / Samlerforlaget Norges Mynter for a data licence with storage, prices and images. Check that it covers the 2018+ coin designs, which Norges Bank's consent still governs.
   - World coins and banknotes: approach **CCG (NGC/PMG)** for KM/Pick data, now that it owns both catalogues.
3. **Ask Numista and Colnect for a storage licence, in writing.** If Numista grants an authorisation under §8.1/§20, it becomes the fastest seeding route for France, Germany and the rest of Europe. Ask Colnect for a commercial quote at the same time.
4. **Don't wait on the licences to launch.** Until they arrive, use Numista only live: an admin-side lookup that shows N# and "Source: Numista" while an editor enters facts from official sources. Store only the N#/issue ID on the Catalog entry or Item.
5. **Never scrape** Numista, Colnect, NGC/PMG, PCGS, Monnaie de Paris, CoinArchives, NumisBids, Sixbid or acsearch. All forbid it.

### (b) Images
1. **Own photography** of coins held by staff or partner dealers. Clean, and the only route that scales safely.
2. **User-contributed photos**, with a ToS clause where the uploader warrants their rights and grants CoinsLite a licence (the Colnect and Numista model). Use them as Catalog images only with explicit opt-in.
3. **Openly licensed photos** from Commons and DigitaltMuseum, per file or object: CC0, CC BY or CC BY-SA only, with credit and licence kept on the image record. Only where the *design* is free: Romania; French francs; US federal designs; designs whose artist died more than 70 years ago; euro common sides (flat).
4. **Official images on request:** the Bundesbank numismatic archive, the US Mint image library (listed designs, "United States Mint image" credit), and the ECB for commemoratives once national-side rights are confirmed.
5. **Rights-protected designs** (Norway 2018+, modern Norwegian/German designs still in copyright, Perth Mint, French designs with licensed IP):
   - Apply for licences: Norges Bank / BONO in Norway; the Perth Mint; Monnaie de Paris.
   - Until then, show an Item's own user photos only, or no image.
6. **Banknotes:** serve ≤72 dpi with an opaque diagonal "SPECIMEN" (ECB and Norges Bank rules). Keep US note images below 75% or above 150% of actual size, one-sided.
7. **Numista images:** display only from a live API response, with `picture_copyright` / licence shown. Never store them.

### (c) Market values
1. Keep the baseline: owner-entered market value plus metal value at spot.
2. **US (Morgan/Peace):** Greysheet CPG retail via API. Label it "CPG® Value", hyperlink to CDN, refresh at least daily (≤24 h cache). Cost is roughly $30/month subscription plus $19–95/month for 10k–50k calls.
3. **Norway:** license *Norges Mynter* prices. It's the national reference and quotes Norwegian-style grades.
4. **Elsewhere:** show Numista grade estimates and recent sales live, as a labelled reference ("Estimate: Numista"). Get written confirmation on whether a value may be snapshotted onto an Item or into the Premium insurance report.
5. **Don't use** auction aggregators or eBay sold data. They aren't available on acceptable terms.
6. Always display that values are estimates, not valuations. Numista §15, NGC and CDN all disclaim them.

### (d) Keeping data fresh
- **Official calendars:**
  - ECB year pages: new 2-euro commemoratives.
  - Bundesbank programme PDFs and dealer order schedules (published through 2027).
  - BNR numismatic-issue announcements.
  - Norges Bank and Det Norske Myntverket releases.
  - US Mint monthly production CSV.
- **Numista as a change detector, IDs only:** a monthly search per issuer and year to find new N# IDs (≈€0.015 each), stored as "to review" for an editor. Stored IDs are explicitly allowed (§8.2).
- **Users:** a correction and suggestion queue into the admin catalogue editor, which fits Catalog entries being "maintained by admins".
- **Prices:** Greysheet daily, Numista live, *Norges Mynter* per licence. Show the source and as-of time.
- **Licence health:** record each licence's revocation and notice terms (Numista 30 days; Colnect and CDN revocable; CDN deletion within 30 business days). Design the schema so a source's data can be purged.

---

## 9. Legal risks to flag

1. **Provenance of the existing seed catalog.** Before launch, document the source and licence of every fact, text field (technical details, historical notes) and image in it.
   - Content taken from Numista (API or site), Colnect, NGC, PCGS, the Perth Mint or Monnaie de Paris without a licence that permits storage would risk breaching contract (Numista API §8.1, ToU §12.2), the EU database right, or copyright in photos and designs.
   - Re-source or license anything whose provenance can't be shown.
   - Numista identifiers (`numista_id`, `numista_issue_id`) may be kept as cross-references in any case (Numista §8.2).
2. **ADR 0001 vs Numista §8.1.** Linking Items to stored Catalog entries is the right design, but those stored facts can't come from Numista without written authorisation. This doesn't call for reopening ADR 0001; it constrains where the data comes from.
3. **Design copyright differs by country** (§6.2). Norway (BONO / Norges Bank, with commercial consent "not usually given" for 2018+ designs) and Germany are the high-risk launch markets for images. Romania is the lowest. Photos of coins carry their own copyright, separate from the design's.
4. **Anti-counterfeiting reproduction rules** for banknotes (ECB/2013/10, Norges Bank, 18 U.S.C. § 504) apply to every banknote image, including users' own photos when shown publicly or exported.
5. **Database rights and ToS contracts.** EU sui generis rights (Directive 96/9/EC art. 7) and site terms forbid substantial or systematic extraction. Monnaie de Paris has also expressly reserved text and data mining.
6. **Third-party IP on modern issues** (licensed characters, artworks) and **trademarks**: Numista, PCGS, NGC, KM™, Pick™, CPG®, "United States Mint" (18 U.S.C. § 709). Use them only as attribution, never in a way that implies endorsement (Numista §4, CDN §4.5).
7. **Premium exports and the insurance report** may count as "bulk download" or "redistribution" of licensed data (Numista §3, CDN §7.7). Exclude third-party-licensed fields from CSV and PDF exports unless the licence covers them.
8. **Price data liability.** Every source disclaims accuracy. The insurance report must keep stating that values are owner-stated or estimates.
9. **Licence revocability and vendor lock-in.** All commercial API licences reviewed are revocable and require deletion on termination. Keep provenance per field so a source can be purged.
10. **VAT and contracting:** Numista bills from France and charges VAT unless you supply company VAT details. Contracts are under French (Numista), Nevada (CoinArchives, NumisBids) or California (Collectors Universe) law.

---

## 10. Norway-specific sources

- ***Norges Mynter*** (catalogue of Norwegian coins 1814 to today):
  - Published by Samlerforlaget Norges Mynter AS, *"et heleid datterselskap av Samlerhuset Norge AS"* (a wholly owned subsidiary of Samlerhuset Norge AS). Samlerhuset also owns Det Norske Myntverket ([om katalogen](https://norgesmynter.no/om-samlerhuset-samlerforlaget-katalogen/)).
  - Prices are *"de store mynthandlernes antatte utsalgspris"* (the major dealers' estimated retail prices), set by an independent editorial board of dealers. Online prices are updated *"løpende etter behov"* (continuously, as needed); print prices once a year.
  - It covers coins only (Carl XIII to Harald V, commemoratives, occupation coins, year sets), with *"bilde samt mynttekniske spesifikasjoner som valør, vekt, diameter, konge, metall"* (an image plus technical specifications: denomination, weight, diameter, king, metal).
  - Det Norske Myntverket sends readers there for mintages: *"Alle Norges mynter fra 1814 til i dag finner du i myntkatalogen Norges Mynter"* (all Norway's coins from 1814 to today are in the *Norges Mynter* catalogue).
  - Footer: *"© Copyright 2025 - Samlerforlaget Norges Mynter AS"*. No terms of use, API or licensing page found.
  - **Verdict: written licence** (post@norgesmynter.no). The de facto Norwegian coin catalogue and price reference. Note that Samlerhuset also sells coins.
- **Skaare**, Kolbjørn: *Norges mynthistorie* (1995, Universitetsforlaget, 2 vols). A scholarly reference whose catalogue numbers are used as cross-references (*secondary*). Citing Skaare numbers is fine; copying its catalogue is not.
- **NNF (Norsk Numismatisk Forening):** its site (numismatikk.no) showed *"Under vedlikehold"* (under maintenance) on 2026-10-08. No catalogue dataset found. It's a possible partner for expert review and for reaching collectors, not a data source.
- **Norges Bank** (§6.5): official text on banknote series and withdrawn coins, reusable with attribution. Design images need consent.
- **DigitaltMuseum** (§6.11): openly licensed images of older Norwegian coins and notes, per object.
- **Numista and Colnect** cover Norway's coins and banknotes, under the terms in §3 and §4.
- **Banknotes, Norway:** no dedicated licensable private catalogue was identified in this pass. Use Norges Bank series pages plus Pick (CCG) or Numista live.

### 10.1 The bundled Norway dataset

CoinsLite ships Norway as a bundled Catalog dataset (`packages/backend/convex/catalog/datasets/norway.ts`), loaded by `catalog/seed:load` like the others. Each source's reuse terms were checked on **2026-10-09**, before any of its data was used. Only the first source below feeds the dataset.

| Source | Reuse terms (quote) | Checked | Verdict | Used |
|---|---|---|---|---|
| Norges Bank website ([copyright and liability](https://www.norges-bank.no/en/disclaimer/), edited 22 August 2020) | *"copies – both electronic and paper-based – may be made of material on this website, provided that Norges Bank is quoted as the source."* Limits: *"No changes may be made in the contents of the material or the website."* No restriction on commercial use. | 2026-10-09 | **Facts: allowed with attribution.** Dates, sizes, alloys, weights and mintages are facts in any case. CoinsLite stores the facts and writes its own notes, and quotes Norges Bank as the source ("Kilde: Norges Bank"). | **Yes:** every fact group |
| Norges Bank [guidelines for banknote and coin designs](https://www.norges-bank.no/en/topics/notes-and-coins/rules-regulations/Guidelines-banknote-coin-designs/) (edited 13 March 2017) | 3.1 (up to series VII and commemoratives before 2018): *"The right to modify or use all or part of a banknote and coin design in a context other than ordinary use by the central bank requires the prior consent of the copyright holder."* 3.2 (series VIII and coins from 2018): *"Such consent is not usually given if the banknote and coin design is intended for use in a commercial context."* | 2026-10-09 | **Images: consent needed** (BONO or Norges Bank) | No: placeholders only |
| Norges Bank open data, listed under [NLOD](https://data.norge.no/nlod/en/2.0) on data.norge.no | NLOD 2.0: *"This licence grants you the right to copy, use and distribute information, provided you acknowledge the contributors"*. The listing covers Norges Bank's statistics API: exchange rates, interest rates and similar series. | 2026-10-09 | Allowed with attribution, but **no notes or coins data** in it. The website pages above are under the website terms, not NLOD. | No |
| *Norges Mynter* (Samlerforlaget Norges Mynter AS, owned by Samlerhuset) | No terms of use, licence or API published; *"© Copyright 2025 - Samlerforlaget Norges Mynter AS"*. | 2026-10-09 | **Written licence** needed (§10) | No: off limits until licensed |
| Det Norske Myntverket (the mint; also owned by Samlerhuset), mintage pages | Terms not checked | – | Unknown | No |
| DigitaltMuseum | Licence per object (§6.11) | 2026-10-08 | Allowed per object (CC0, CC BY, CC BY-SA) where the design is out of copyright | Not yet: no images in this pass |

**Scope of the first release:** Norway's money in the krone era, as far as Norges Bank documents it:

- every banknote from series I (1877) to the current series VIII, plus the small-denomination notes of 1917–1925 and 1940–1950;
- circulation coins from 1958, one Catalog entry per coin type with its years of minting;
- commemorative coins from 1906 to 2024, including the Lillehammer 1994 series.

The tree is country Norway → denomination ("1-krone coins", "100-krone notes") → series (Olav V, Harald V, Commemorative coins, Lillehammer 1994 Winter Olympics; banknote series I–VIII and the small-denomination notes) → entries. That makes 100 coin entries and 46 banknote entries. Strike is set where Norges Bank states it: circulation for circulation coins, proof where a commemorative was issued in proof.

**Pages used** (all Norges Bank, checked 2026-10-09):

- banknote series I–VII and the small-denomination notes under [withdrawn notes and coins](https://www.norges-bank.no/en/topics/notes-and-coins/withdrawn-notes-coins/);
- the series VIII notes under [legal tender notes and coins](https://www.norges-bank.no/en/topics/notes-and-coins/legal-tender-notes-coins/);
- [coins 1957–1991](https://www.norges-bank.no/en/topics/notes-and-coins/withdrawn-notes-coins/Coins-1957-1991/), [coins 1992–1996](https://www.norges-bank.no/en/topics/notes-and-coins/withdrawn-notes-coins/Coins-1992-1996/) and the [50-øre coin 1996–2011](https://www.norges-bank.no/en/topics/notes-and-coins/withdrawn-notes-coins/50-ore-coin-1996-2011/);
- the current coins' design and technical data pages, for example the [1-krone coin](https://www.norges-bank.no/tema/Sedler-og-mynter/gyldige-sedler-mynter/1-kronemynten/1-utforming/);
- the [overview of commemorative coins 1906–2004](https://www.norges-bank.no/globalassets/upload/sedler-og-mynter/minnemynter_norges_bank.pdf) (PDF, Norwegian), the [commemorative coin pages](https://www.norges-bank.no/tema/Sedler-og-mynter/Minnemynter/) from 2002 and their [mintage table](https://www.norges-bank.no/tema/Sedler-og-mynter/Minnemynter/Opplagstall/).

Commemorative titles use Norges Bank's Norwegian name for the occasion, as the 2-euro titles use the issuing country's language (§6.4). Where the overview gives a figure that contradicts the rest of the coin's data, the figure is left out rather than guessed: the 1978 5-krone and 1993 Grieg 1500-krone diameters, and the 1999 100-krone weight. For the 2011 ski coin, the mintage comes from the mintage table, because the coin's own page repeats another coin's figure.

**Not yet in the dataset:**

- circulation coins from 1875 to 1957, which Norges Bank's pages don't cover;
- an entry per year struck for the coins from 1958. Norges Bank gives only each type's years of minting, and a year inside that range may not have been struck.

Both need a year-by-year source. The obvious one is *Norges Mynter*, once licensed.

**Images:** none. Every entry shows the placeholder until the design's rights holder consents (BONO for designs up to series VII and commemoratives before 2018; Norges Bank for series VIII and coins from 2018). Any banknote image must also follow the reproduction rules: at most 72 dpi, with "SPECIMEN" across it.

**Licensing enquiries:** a human sends them, to Norges Bank about design images and to Samlerforlaget Norges Mynter about a data licence. Their outcome is recorded on the Norway ticket and here.

---

## 11. Banknotes specifically

- **Numista** covers banknotes (printers, signatures, watermark side, Pick references), under the terms in §3.
- **PMG World Paper Money Price Guide / Pick (CCG):** free to view, no API. **Written licence** (§5.2).
- **The Banknote Book** (Owen Linzmayer; acquired by CDN in 2021, *secondary*): values exposed through the CDN API under the "Banknote Book" CPG label. **Allowed with attribution** (CDN §4.4).
- **PCGS Banknote** endpoints (cert/grade lookups): **written licence** (§5.1).
- **IBNS:** *"Copyright © 2026 IBNS. All rights reserved unless otherwise stated."* IBNS promotes **BanknoteDB.com**, a collaborative database built by IBNS members (Pick and TBB numbers, UV images). No terms or licence page was found on BanknoteDB: **unclear, ask** (admin@banknotedb.com).
- **banknote.ws:** the site served an invalid TLS certificate on 2026-10-08, and no terms were seen. A Numista forum post (*secondary*) says photographers are not credited there. **Unclear; avoid.**
- **Reproduction rules** (§6.5, §6.7) apply to all banknote images.

---

## 12. Not evaluated / gaps
- **uCoin.net:** its terms are behind an interactive bot challenge, so they weren't read.
- **NGC/PMG, US Mint, Banque de France:** some pages blocked automated access. The quotes above marked *search excerpt* should be checked by hand.
- **Colnect CAPI spec** (.docx): not retrievable.
- **PCGS API End User Agreement:** not public without logging in.
- **Heritage Auctions, Catawiki and other auction houses' own APIs:** not covered.
- **Spot-price provider** for metal values: out of scope.

---

## Sources

All accessed **2026-10-08**. "(search excerpt)" means the page couldn't be opened directly and its wording came through a web-search result. "(secondary)" means a press, newsletter or forum source.

**Numista**
- https://en.numista.com/api/
- https://en.numista.com/api/doc/index.php (API documentation v3.36.1)
- https://en.numista.com/api/pricing.php
- https://en.numista.com/api/license.php (API Terms of Use and License Agreement)
- https://en.numista.com/conditions.php (Terms of Use, version of 3 January 2023)
- https://en.numista.com/forum/topic145333.html (secondary: image licence fields)
- https://en.numista.com/catalogue/index.php (coverage count)
- https://en.numista.com/
- https://api.numista.com/v3 (returns 401 without a key)

**Colnect**
- https://colnect.com/en/help/collecting/colnect_api
- https://colnect.com/en/help/collecting/terms_of_service
- https://colnect.com/en/coins
- https://colnect.com/en/banknotes
- https://colnect.com/downloads/ColnectAPISpecification.docx (bot-protected; not read)

**PCGS / Collectors Universe**
- https://www.pcgs.com/publicapi
- https://www.pcgs.com/publicapi/documentation
- https://api.pcgs.com/publicapi/swagger/ui/index
- https://www.collectors.com/Home/TermsOfUse

**NGC / PMG / CCG / KM / NumisMaster**
- https://www.ngccoin.com/legal/terms-of-use/ (search excerpt)
- https://www.ngccoin.com/mobile/Disclaimer.aspx (search excerpt)
- https://www.ngccoin.com/news/article/15389/ngc-pmg-acquire-km-pick-catalogs/ (blocked; text via reprints below)
- https://www.coinbooks.org/v29/esylum_v29n27a07.html (secondary: reprint of CCG release, 2026)
- https://www.mccatl.org/ngc-and-pmg-acquire-the-km-and-pick-catalogs-of-world-coins-and-banknotes/ (secondary: reprint)
- https://coinbooks.org/v24/esylum_v24n04a15.html (secondary: 2021 AIM licence)
- https://www.numismaster.com/ → https://www.numismaticnews.net/pricing (closure notice)
- https://www.numismaticnews.net/a-note-from-the-publisher-of-numismatic-news-world-coin-news-and-bank-note-reporter
- https://www.pmgnotes.com/legal/terms-of-use/ (blocked)

**Greysheet / CDN**
- https://www.greysheet.com/cms/1053/api-terms-of-use-and-license-agreement
- https://www.greysheet.com/publications/api-pricing
- https://www.greysheet.com/cms/1049/cdn-public-api-v2-usage-guide
- https://www.greysheet.com/about/subscribe
- https://www.greysheet.com/news/story/cdn-publishing-acquires-the-banknote-book-from-owen-linzmayer (search excerpt)

**Price data / auctions / eBay**
- https://www.coinarchives.com/aboutus.php
- https://pro.coinarchives.com/about.php
- https://pro.coinarchives.com/terms.php
- https://www.numisbids.com/terms
- https://www.sixbid.com/en/terms-and-conditions
- https://www.acsearch.info/terms.html
- https://developer.ebay.com/api-docs/buy/static/ref-marketplace-supported.html
- https://developer.ebay.com/api-docs/buy/static/buy-requirements.html

**Open data**
- https://www.wikidata.org/wiki/Wikidata:Licensing
- https://query.wikidata.org/sparql (coverage query, run 2026-10-08)
- https://commons.wikimedia.org/wiki/Commons:Currency
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- https://nomisma.org/
- https://nomisma.org/datasets

**EU / ECB**
- https://www.ecb.europa.eu/euro/coins/comm/html/index.en.html
- https://www.ecb.europa.eu/euro/coins/comm/html/comm_2025.en.html
- https://www.ecb.europa.eu/services/disclaimer/html/index.en.html
- https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52001DC0600 (COM(2001) 600, euro coin common face)
- https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32013D0010 (ECB/2013/10, banknote reproduction)
- https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:31996L0009 (Database Directive)
- https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0790 (DSM Directive art. 14)

**Norway**
- https://www.norges-bank.no/en/topics/notes-and-coins/rules-regulations/Guidelines-banknote-coin-designs/
- https://www.norges-bank.no/en/disclaimer/
- https://www.norges-bank.no/en/topics/notes-and-coins/withdrawn-notes-coins/
- https://norgesmynter.no/
- https://norgesmynter.no/om-samlerhuset-samlerforlaget-katalogen/
- https://www.myntverket.no/utgivelser-opplag-norske-mynter/
- https://www.numismatikk.no/ (under maintenance)
- https://www.norges-bank.no/en/topics/notes-and-coins/legal-tender-notes-coins/ (checked 2026-10-09)
- https://www.norges-bank.no/en/topics/notes-and-coins/Commemorative-coins/ (checked 2026-10-09)
- https://www.norges-bank.no/tema/Sedler-og-mynter/Minnemynter/ (checked 2026-10-09)
- https://www.norges-bank.no/globalassets/upload/sedler-og-mynter/minnemynter_norges_bank.pdf (checked 2026-10-09)
- https://data.norge.no/nlod/en/2.0 (NLOD 2.0, checked 2026-10-09)
- https://data.norge.no/en/datasets/23076ce8-b442-407c-817f-0d4ec3cbe744 (Norges Bank open data listing, search excerpt, 2026-10-09)
- https://dok.digitaltmuseum.org/en/terms-of-use
- https://en.wikipedia.org/wiki/Kolbj%C3%B8rn_Skaare (search excerpt, secondary)

**United States**
- https://www.usmint.gov/resources/terms-of-use
- https://www.usmint.gov/news/image-library/circulating-coin-design-use-policy (search excerpt)
- https://www.usmint.gov/about/production-sales-figures (search excerpt)

**France**
- https://www.monnaiedeparis.fr/fr/mentions-legales
- https://www.banque-france.fr/fr/mentions-legales (blocked)
- https://www.banque-france.fr/billets/reconnaitre-et-utiliser-les-billets-et-les-pieces-en-euros/les-regles-de-reproduction-dimages-de-billets (search excerpt)

**Romania**
- https://legislatie.just.ro/Public/DetaliiDocument/221527 (Law 8/1996, republished)
- https://www.bnr.ro/2281-termeni-si-conditii
- https://www.bnr.ro/662-bancnote-si-monede
- https://www.bnr.ro/2638-emisiuni-numismatice (client-rendered; content not captured)

**Germany**
- https://www.bundesbank.de/en/homepage/user-information/conditions-for-the-general-use-of-the-website-764706
- https://www.bundesbank.de/en/bundesbank/numismatics/pictures-archive/pictures-archive-of-german-notes-and-coins-616482
- https://www.bundesbank.de/en/tasks/cash-management/reproduction-regulations/regulations-concerning-the-protection-of-banknotes-and-coins-623820
- https://bundesbank.de/en/tasks/cash-management/euro-coins/collector-coins (search excerpt)

**Australia**
- https://www.perthmint.com/terms-and-conditions/

**Banknotes**
- https://www.theibns.org/joomla/index.php?option=com_content&view=article&id=986&Itemid=183
- https://banknotedb.com/
- https://banknote.ws/ (TLS certificate error)
- https://fr.numista.com/forum/topic63275.html (search excerpt, secondary)
- https://en.ucoin.net/terms (blocked; not evaluated)

**CoinsLite repo context**
- `GLOSSARY.md` (glossary); `docs/adr/0001-items-link-to-catalog-entries.md`
