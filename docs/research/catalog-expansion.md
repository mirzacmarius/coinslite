# Catalog expansion: the next datasets and their images

**Question:** CoinsLite's collectors mostly collect the Nordic countries, the eurozone's circulation coins, the UK, the US, Romania, and banknotes. For those areas, which sources may CoinsLite store as Catalog datasets, and which images may it show? For each source: what its licence allows (store, modify, commercial use, attribution), how good and complete the data is, and what it would take to turn it into a Catalog CSV.

**Researched:** 2026-10-12 (COIN-134). This builds on [catalog-data-sources.md](catalog-data-sources.md) (2026-10-08) and doesn't repeat it. That document covers Numista, Colnect, PCGS, NGC/PMG, Greysheet, Wikidata, Nomisma, the ECB's 2-euro commemoratives, Norges Bank, the US Mint's terms, Monnaie de Paris, the BNR's terms, the Bundesbank, the Perth Mint and the auction sites.

**How sources are marked:** every claim is tied to a primary source listed under [Sources](#sources). Some sites block automated reading. Pages read from a Wayback Machine copy are marked *Wayback copy*, and wording seen only in a search result is marked *search excerpt*.

**Not legal advice.** The open legal questions are collected in [§6](#6-questions-for-a-person).

**Terms** follow `GLOSSARY.md`: Catalog, Catalog entry, Theme, Premium.

---

## 1. Key findings (read this first)

1. **Two ECB sources are the quickest wins.** Both are licensed exactly like the 2-euro commemoratives CoinsLite already ships ([§3.1](#31-eurozone-circulation-coins), [§3.2](#32-euro-banknotes)).
   - **Euro circulation coins:** about 295 entries, one per country, denomination and design series. They come from 8 static ECB pages plus the common-side specifications.
   - **Euro banknotes:** 13 entries.
2. **Euro banknotes are the first Catalog images that are clearly free to show.** The ECB says *"You are free to use images of euro banknotes without prior authorisation as long as you comply with the ECB's rules"*. It also publishes a ready-made set of 72 dpi images marked "specimen".
3. **No euro coin's national side is clearly free to show.** The Commission says the issuing countries *"are the holders of the copyright in the design of the national sides"*.
   - Its country-by-country file shows most of them require permission.
   - This applies to the bundled 2-euro commemoratives too, which correctly show placeholders.
4. **Romania's numismatic catalogue can be read and stored with attribution, but its images need a person to confirm.**
   - **Data:** the BNR's list of about 367 collector issues (1995–2026) can be read through the site's own block endpoints. Its terms allow redistribution *"sub orice formă"* (in any form) with the source named.
   - **Images:** Romanian law excludes means of payment from copyright. But the BNR says its designs are registered designs, and Law 312/2004 requires its written consent for 1:1 colour reproductions. ([§3.3](#33-romania))
5. **The US Mint's coin programme pages are public domain, but many of the designs can't be shown.** The pages cover the 50 State Quarters, DC & Territories, America the Beautiful, American Women, Presidential $1 and Native American $1, about 190 designs.
   - **Allowed:** the Mint's design-use policies allow the State Quarters, DC & Territories and Presidential $1 designs.
   - **Not allowed:** many later designs were assigned to the Mint by outside artists. The Mint is *"not accepting any new applications for commercial licenses"*. ([§3.4](#34-united-states))
6. **Finland has the cleanest Nordic source: Finlex, under CC BY 4.0.** It holds one decree per collector coin, with its specifications.
   - The Bank of Finland's website only allows quotation.
   - Finnish coin images are contested. A 1989 Copyright Council statement says coin images published in decrees aren't protected. The Commission's file says the Ministry of Finance *"has copyrights based on contracts"*. ([§3.5](#35-finland))
7. **Denmark and Iceland allow copying with credit but no changes, and their lists are small. Sweden's list is the richest, but no licence clearly covers it.**
   - Sweden's open-data clause names its archive, diary, publications, decisions and statistics, not its notes and coins pages.
   - So Sweden needs a one-line confirmation from the Riksbank. ([§3.6](#36-denmark), [§3.7](#37-iceland), [§3.8](#38-sweden))
8. **The UK's only clean source is The Gazette's royal proclamations**, under the Open Government Licence.
   - They give specifications and design descriptions, but no mintages.
   - The Royal Mint's mintage figures and the Bank of England's banknote pages need a written licence.
   - The Royal Mint *"do[es] not routinely grant permission for UK coinage designs to be used by third parties for commercial purposes"*. ([§3.9](#39-united-kingdom))
9. **A coin photo on Wikimedia Commons usually has two licences:** the photographer's (often CC BY-SA 4.0) and the design's (for example PD-USGov-money).
   - The Commons API's `extmetadata` reports only one of them, "Public domain", even when the photo is CC BY-SA. An importer has to read every licence on the file page.
   - Commons says hotlinking is *"allowed"* but *"not generally recommended"*. So images should be copied into CoinsLite's own storage. Converting them to WebP is a technical modification, which under CC 4.0 §2(a)(4) *"never produces Adapted Material"*. ([§4.3](#43-wikimedia-commons-in-practice))
10. **The Smithsonian's CC0 numismatic images are too thin to rely on.** Its Open Access API returns 462,356 records from the National Numismatic Collection, but only about 210 of them come with a CC0 image (counted 2026-10-12, [§4.4](#44-museums)).

---

## 2. Ranked shortlist

Ranked by value per effort, best first.
- **Value** combines three things:
  - how many of CoinsLite's collectors the dataset serves (every eurozone collector uses euro coins; Romania is a launch market with its own app language);
  - how many entries it adds;
  - whether it brings images.
- **Effort** means one agent or developer, including review of the generated file.
- **Entries** counts Catalog entries, not grouping nodes.
- Where two rank close, the one with the clearer licence and the existing pipeline goes first.

| # | Dataset | Source | Licence verdict | Entries | Effort | Entries a day | Images in scope | Follow-up |
|---|---|---|---|---|---|---|---|---|
| 1 | Euro circulation coins, every issuer's national sides | ECB national-side pages + common-side specifications | **Allowed with attribution** (ECB terms, as the 2-euro dataset) | ~295 | M (2 days) | ~150 | No (national sides need each country's consent) | COIN-135: **built** (`catalog/datasets/euroCirculationCoins.ts`, 295 entries) |
| 2 | Romania: numismatic issues 1995–2026, circulation coins and notes | BNR website | **Allowed with attribution** + "free at bnr.ro" notice for paid services | ~380 | M (2 days) | ~190 | No (needs BNR confirmation) | COIN-137 |
| 3 | Euro banknotes, first and Europa series | ECB pages, Decision ECB/2013/10, ECB press releases | **Allowed with attribution**; images **allowed** under ECB/2013/10 | 13 | S (1 day incl. images) | 13 | **Yes**: the Catalog's first clearly free images | COIN-136 |
| 4 | US circulating coin programmes 1999–2025 | US Mint coin pages + coin specifications | **Allowed** (public domain, 17 U.S.C. § 105) | ~400 (design × mint) | M–L (3 days) | ~130 | No (separate step; see §4) | COIN-138 |
| 5 | Denmark: circulation coins, theme and commemorative coins | Danmarks Nationalbank website | **Allowed with attribution**, no changes to the material | ~60 | S (1 day) | ~60 | No | COIN-140 |
| 6 | Finland: collector and commemorative coins | Finlex decrees | **Allowed with attribution** (CC BY 4.0) | one per decree (count from the API) | M (2–3 days) | unknown | No (Ministry of Finance claims copyright) | COIN-139 |
| 7 | UK circulating coins since 1968 | The Gazette, royal proclamations | **Allowed with attribution** (OGL v3.0) | one per circulating design | L (3–5 days) | low | No (Crown copyright, Royal Mint permission) | COIN-141 |
| 8 | Sweden: banknotes since the 1890s, coins, commemoratives | Sveriges Riksbank website | **Unclear**: confirm the open-data clause covers these pages | ~100 | M (2 days) after confirmation | ~50 | No | COIN-142 |

**Ranking notes:**
- Euro coins come before Romania despite fewer entries a day: they serve the most collectors and reuse the bundled 2-euro pipeline and licence.
- Euro banknotes rank on their images, not their entries.

**Image follow-up (not a dataset):** COIN-143 lets an admin add a Catalog image from a Wikimedia Commons file with its credit read from the file page ([§4.3](#43-wikimedia-commons-in-practice)). The first use is the bundled US silver dollars: their 120 entries (96 Morgan, 24 Peace) have public-domain designs, and Commons has free photos of many of them.

**Not shortlisted:**
- **Iceland:** about 15 entries, and the pages render only in a browser ([§3.7](#37-iceland)).
- **Per-year mintages for euro coins:** the only reusable source found is the Bundesbank's PDF of minting orders. That PDF is a *search excerpt* (not read), and orders aren't mintages ([§3.1](#31-eurozone-circulation-coins)).
- **UK banknotes:** the Bank of England's pages need a written licence.
- **US banknotes:** the series-level facts are thin ([§3.4](#34-united-states)).

**Dataset built in this pass: none.** The only candidate that is both small and unambiguously licensed is the euro banknotes, and they need a new Catalog shape, not just a dataset:
- **A Theme whose children are series, with entries that have no country.** The euro area has no ISO country code.
- **Code that assumes a Theme's children are countries:** the backend treats every child of a Theme as a country node (`countryNodeKeyOf` in `catalog/tree.ts`), so the app would offer browsing by denomination on each series.
- **A translated title:** the Theme's title would need translating, as the 2-euro Theme's is.
- **A spec change:** this departs from spec §6.2 (*"For a Theme: its countries"*).

COIN-136 specifies the shape, the code to check and the spec change, rather than slipping them in here.

**Verdict key:** as in [catalog-data-sources.md](catalog-data-sources.md#2-summary-table): **Allowed**, **Allowed with attribution**, **Written licence**, **Not allowed**, **Unclear**.

---

## 3. Candidates

### 3.1 Eurozone circulation coins

**Data**
- **National sides:** one ECB page per denomination: `https://www.ecb.europa.eu/euro/coins/{2euro,1euro,50cents,20cents,10cents,5cents,2cents,1cent}/html/index.en.html`. These are static HTML, readable without a browser.
  - Each page lists 25 issuers: the 21 euro-area members including Bulgaria (2026), plus Andorra, Monaco, San Marino and Vatican City.
  - Each issuer gets one image per design series and a paragraph of text. The text names the motif, often the designer, design changes (*"In 2008 Belgium slightly modified the design…"*) and the €2 edge lettering.
  - There is no structured first-issue year, mint mark or mintage. Image file names carry the series year (`Belgium_2euro_2008.jpg`).
- **How many entries:** images per page are €2 38, €1 38, 50c/20c/10c 37 each, 5c/2c/1c 36 each. That makes about **295** country × denomination × design-series entries.
  - Several issuers have more than one series: Vatican 5, Belgium 3, Monaco 3, Spain 3 (€1/€2) or 2, France 2 (€1 to 10c), the Netherlands 2, San Marino 2.
- **Specifications:** the [common sides page](https://www.ecb.europa.eu/euro/coins/common/html/index.en.html) gives each denomination's diameter, thickness, weight, shape, colour, composition and edge. For example, €2 is 25.75 mm, 2.20 mm and 8.50 g, with *"Outer part: copper-nickel; inner part: three layers: nickel brass, nickel, nickel brass"*.
  - The exact alloy percentages, which the `composition` column needs, are in Council Regulation (EC) No 975/98 as amended, on EUR-Lex.
    - Regulation 975/98 was repealed and recast by Council Regulation (EU) No 729/2014 (Art. 12), whose Annex I carries the same table, with Nordic gold as Cu89Al5Zn5Sn1. The built dataset credits 729/2014.
  - **Reuse of EUR-Lex documents:** Commission Decision 2011/833/EU (read on [legislation.gov.uk's copy](https://www.legislation.gov.uk/eudn/2011/833/article/6/data.htm), because EUR-Lex blocked automated reading).
    - Art. 3(2) defines reuse as use *"for commercial or non-commercial purposes"*.
    - Art. 6(2) allows these conditions: *"the obligation for the reuser to acknowledge the source of the documents; (b) the obligation not to distort the original meaning or message of the documents"*.
    - The bundled 2-euro dataset already credits Official Journal notices on this basis.
- **First year per issuer:**
  - The 12 founding countries: *"On 1 January that year euro banknotes and coins were introduced in 12 countries"* ([2002 changeover](https://www.ecb.europa.eu/euro/changeover/2002/html/index.en.html)).
  - Later joiners: Slovenia 2007, Cyprus and Malta 2008, Slovakia 2009, Estonia 2011, Latvia 2014, Lithuania 2015, Croatia 2023, Bulgaria 2026 (ECB "Joining the euro area" pages).

**Licence (data): Allowed with attribution.** The [ECB's terms](https://www.ecb.europa.eu/services/disclaimer/html/index.en.html) are already applied to the 2-euro dataset (`catalog/datasets/euroCommemoratives.ts`):
- Users *"may make free use of the information obtained directly from it"*, citing the ECB.
- Buyers of a sold product must be told the information is free of charge from the ECB.
- Changes must be stated.

**Images: not clearly free in any country.**
- **The ECB's permission doesn't cover them.** Its terms are worded around *"information"* and never mention images.
- **The Commission** ([copyright and reproduction rules](https://economy-finance.ec.europa.eu/euro/euro-coins-and-notes/copyright-and-reproduction-rules-euro-coins-and-notes_en)):
  > "Reproduction of the national sides of the euro coins is governed by the legislation of the issuing countries, since these are the holders of the copyright in the design of the national sides."
  >
  > "For authorisation to reproduce the national side of a commemorative coin, please contact the competent national authority."
- **The Commission's file of national rules** ([*Copyright of the national sides of euro circulation coins*](https://economy-finance.ec.europa.eu/document/download/2d5c4f98-07e0-450c-995a-d1655af47c72_en?filename=copyright_national_sides_euro_coins_info_for_europa_website.xlsx), XLSX, 10 September 2019):
  - **Permission needed:**
    - Ireland: *"any person wishing to use these images requires the permission of the Minister for Finance"*.
    - Estonia: authorisation from Eesti Pank.
    - Finland: *"Ministry of Finance has copyrights. Reproduction is possible with the permission of Ministry of Finance."*
    - Spain: *"Subject to authorization by the competent authorities"*.
    - Italy: request to the Ministry of Economics and Finance.
    - Austria: Münze Österreich is the sole owner of the reproduction rights.
    - Slovakia: Národná banka Slovenska holds copyright in all national-side designs.
    - Lithuania: authors assign copyright to the Bank of Lithuania by contract.
    - Malta: the Central Bank of Malta acts for the Treasury.
  - **The two most open:**
    - The Netherlands: *"Basically, there are no restrictions on the use of the design on the national side of the coin but the Ministry may in certain cases prohibit such use."*
    - Slovenia: the same rules as the common side.
  - **Missing from the file:** France, Croatia, Bulgaria, Andorra, Monaco, San Marino and Vatican City.
- **[Commons:Currency](https://commons.wikimedia.org/wiki/Commons:Currency)** agrees for most countries: Ireland, the Netherlands, Slovenia, Spain, Malta, Slovakia, Bulgaria and Finland are "Not OK", and Austria and Germany are "most likely not OK". The exception is Lithuania, which it marks OK, against the Commission's file.
- **The common side** may be reproduced flat (COM(2001) 600, quoted in the earlier research). On its own it doesn't identify a national coin.

**Mintages**
- **The ECB** publishes only euro-area totals by denomination.
- **The Bundesbank** publishes German minting orders by year and mint mark as a PDF (*search excerpt*; the PDF wasn't read). Its [terms of use](https://www.bundesbank.de/de/startseite/benutzerhinweise/nutzungsbedingungen-fuer-den-allgemeinen-gebrauch-der-website-763554) allow this:
  > "Es steht Ihnen frei, für Ihren persönlichen oder geschäftlichen Gebrauch von der Deutschen Bundesbank erstellte Informationen in körperlicher oder elektronischer Form zu speichern, weiterzugeben oder zu vervielfältigen. Die Informationen dürfen nicht verändert oder verfälscht werden."

  ("You may store, pass on or copy information produced by the Deutsche Bundesbank for personal or business use. The information must not be altered or falsified.") The credit is *"Quelle: Deutsche Bundesbank"*. These are orders, not confirmed mintages, so they're a later refinement for Germany only.
- **The Bank of Finland** publishes Finnish mintages per year, credited to the Mint of Finland. Its [terms](https://www.suomenpankki.fi/en/disclaimer/) allow use only *"to a limited extent and as provided for in copyright law"*: **unclear**.
- No reusable per-year mintage tables were found for the Netherlands, France, Italy or Spain.

**Effort: M (about 2 days).** Extend `scripts/fetch-euro-commemoratives.ts`, or add a sibling script, to read the 8 denomination pages and the specifications page. Designer names and first years need about half a day of curation from the free text.

**Catalog shape:** one country root per issuer, then denomination, then design series, then one entry per coin type with its years. This is how Norway's circulation coins from 1958 are modelled.

### 3.2 Euro banknotes

**Data (13 entries)**

| Series | Value | Size (mm) | Issued | Colour | Architectural style |
|---|---|---|---|---|---|
| First | €5 | 120 × 62 | 1 Jan 2002 | Grey | Classical |
| First | €10 | 127 × 67 | 1 Jan 2002 | Red | Romanesque |
| First | €20 | 133 × 72 | 1 Jan 2002 | Blue | Gothic |
| First | €50 | 140 × 77 | 1 Jan 2002 | Orange | Renaissance |
| First | €100 | 147 × 82 | 1 Jan 2002 | Green | Baroque and rococo |
| First | €200 | 153 × 82 | 1 Jan 2002 | Yellow-brown | Iron and glass architecture |
| First | €500 | 160 × 82 | 1 Jan 2002 | Purple | Modern 20th-century architecture |
| Europa | €5 | 120 × 62 | 2 May 2013 | Grey | Classical |
| Europa | €10 | 127 × 67 | 23 Sep 2014 | Red | Romanesque |
| Europa | €20 | 133 × 72 | 25 Nov 2015 | Blue | Gothic |
| Europa | €50 | 140 × 77 | 4 Apr 2017 | Orange | Renaissance |
| Europa | €100 | 147 × 77 | 28 May 2019 | Green | Baroque and rococo |
| Europa | €200 | 153 × 77 | 28 May 2019 | Yellow-brown | Iron and glass architecture |

- **Sizes, colours and styles:** Decision ECB/2013/10, Art. 1, as amended by ECB/2019/9. EUR-Lex blocked automated reading, so this was checked against [legislation.gov.uk's copy](https://www.legislation.gov.uk/eudn/2013/10/article/1/data.htm) (frozen at the end of 2020) and the [ECB's reproduction FAQ](https://www.ecb.europa.eu/euro/banknotes/images/html/ecb.faq_reproduction_rules_euro_banknotes.en.html) (Q7).
- **Issue dates:**
  - First series: the 2002 changeover page.
  - Europa series: ECB press releases ([€5](https://www.ecb.europa.eu/press/pr/date/2013/html/pr130110_1.en.html), [€10](https://www.ecb.europa.eu/press/pr/date/2014/html/pr140113.en.html), [€20](https://www.ecb.europa.eu/press/pr/date/2015/html/pr150224.en.html), [€50](https://www.ecb.europa.eu/press/pr/date/2016/html/pr160705.en.html), [€100 and €200](https://www.ecb.europa.eu/press/pr/date/2018/html/ecb.pr180917.en.html)).
- **The €500:** the ECB says it *"has not been issued since 27 April 2019"* ([current banknotes](https://www.ecb.europa.eu/euro/banknotes/current/html/index.en.html)). Every euro banknote remains legal tender, so no entry gets a `withdrawal_date`.
- **Signatures, printer codes and country codes** are on the ECB's [design page](https://www.ecb.europa.eu/euro/banknotes/current/design/html/index.en.html):
  - Signatures: Duisenberg, Trichet and Draghi on the first series; Draghi and Lagarde on the Europa series.
  - Each serial number's printer letter or country letter is listed there.
  - These are varieties for a later pass. The first pass has one entry per series and denomination.

**Licence (data): Allowed with attribution.** The ECB's terms apply, as in §3.1. Sizes and dates are facts.

**Images: Allowed, under conditions.** From the ECB's [use of euro banknote images](https://www.ecb.europa.eu/euro/banknotes/images/html/index.en.html):
> "You are free to use images of euro banknotes without prior authorisation as long as you comply with the ECB's rules on the reproduction of banknotes (see in particular Article 2 of Decision ECB/2013/10)."
>
> "You are free to download low-resolution (72 dpi) images of euro banknotes marked with the word "specimen"."

- **The ready-made set:** the zip (`/euro/shared/img/euro_banknotes_specimen_72dpi.zip`) holds the front and back of every note in both series, and the Europa notes in both signature versions.
- **The digital rules:** *"specimen"* runs diagonally across the image, covering at least 75% of its length and 15% of its width. The resolution must not exceed 72 dpi at 100% size.
- **What CoinsLite must do:** serve these files as they are, never upscaled. The Catalog's image pipeline never upscales. Its 800 px limit must not enlarge a note beyond 72 dpi at its real size: €500 is 160 mm, which is 454 px at 72 dpi.

**Catalog shape:** there is no ISO 3166 code for the euro area, and the Catalog's country check accepts only ISO codes. The proposal:
- A Theme root titled "Euro banknotes", translated in the app like the 2-euro Theme.
- Its two series as groupings, then the 13 entries without a country.
- Spec §6.1 and §6.2 updated to say a Theme's children may be series.

**What the code does with it:**
- The backend makes each child of a Theme a "country node" (`countryNodeKeyOf` in `catalog/tree.ts`). So each series would be browsed by denomination.
- The app names a country node by its country if it has one, otherwise by its title. A series would show its title, but the browse-by and picker paths need checking.

**The glossary still fits:** `GLOSSARY.md` defines a Theme as a grouping *"whose entries span several countries"*, and euro banknotes circulate in all 21 euro-area countries. What changes is only the spec's description of a Theme's children.

**Effort: S (about 1 day)**, including the Theme title's translations and uploading each note's specimen front image as its Catalog image (13 images).

### 3.3 Romania

**Data**
- **Reading the site:** bnr.ro renders client-side. Each page is a shell with numbered blocks, and `POST https://www.bnr.ro/blocks` with `bid`, `currentSlug` and `cat_id` returns a block's HTML. This was checked on the terms page on 2026-10-12. Paged lists use `POST https://www.bnr.ro/getpaginare` with `bid` and `pagina`.
  - The terms point automated retrieval to *"recomandările specificate în pagina dedicată dezvoltatorilor de software"* (the recommendations on the page for software developers). That page now redirects to the homepage.
- **Numismatic catalogue** ([monede și medalii](https://www.bnr.ro/2271-monede-si-medalii)): 37 pages, about **367** issues from 15 December 1995 to 24 August 2026.
  - Fields per piece: nominal value, metal and fineness (*"Argint 999/1000"*), weight, diameter, edge, quality (proof or BU), maximum mintage (*"Tiraj maxim"*), and descriptions of both sides.
  - No designer field. Some BNR pages carry broken values, for example *"Valoare nominală: [##1106##]"* on a 1996 issue.
  - There are also numismatic banknotes and mint sets.
- **Circulation coins** ([monede în circulație](https://www.bnr.ro/2267-monede-in-circulatie)): 1, 5, 10 and 50 bani, with alloy, colour, diameter and edge, but no weight.
- **Circulation banknotes** ([bancnote în circulație](https://www.bnr.ro/764-bancnote-in-circulatie)): 1 to 500 lei, with size, colour, polymer substrate and both sides' design. They link the BNR circular for each issue (2005, 2006, 2008, 2017, 2021, 2026).
- **Withdrawn issues:**
  - The 2000–2003 polymer notes have detail pages.
  - The 1991–1994 and 1996–2000 pages currently redirect to the homepage.
  - The old leu was converted at 10,000 to 1 on 1 July 2005.

**Licence (data): Allowed with attribution, with two conditions.** From the [terms](https://www.bnr.ro/2281-termeni-si-conditii), read on 2026-10-12:
> "BNR permite accesul liber la informaţiile publicate și utilizarea acestora în scop personal. Redistribuirea sub orice formă şi prin orice mijloace a conţinutului informațional este permisă numai cu indicarea sursei. În cazul alterării informației preluate din website, acest lucru trebuie menţionat explicit. În cazul în care scopul preluării informațiilor îl constituie furnizarea unor servicii contra cost sau integrarea în documente destinate comercializării, clienţii finali vor fi înștiințați că informațiile sunt preluate din website-ul BNR, unde sunt accesibile în mod gratuit."

("The BNR allows free access to the published information and its use for personal purposes. Redistribution in any form and by any means of the informational content is allowed only with the source indicated. If information taken from the website is altered, this must be stated explicitly. Where information is taken to provide paid services or for documents meant for sale, end clients will be told that it comes from the BNR website, where it is free of charge.")

**Reading:** the personal-use sentence grants a use; it doesn't limit the next one. The redistribution clause covers any form, and the last sentence explicitly provides for paid services. So storing and showing the facts in CoinsLite, Premium included, is allowed on three conditions:
1. Name the BNR as the source.
2. State changes.
3. Tell Premium users the information is free at bnr.ro.

The terms also reserve third-party material: *"fotografii, materiale grafice sau alte elemente vizuale provenite de la furnizori autorizați de imagini (stock) sau de la alte părți terțe … copierea, reutilizarea sau redistribuirea acestora poate avea loc doar cu autorizarea prealabilă a acestora"* (photos, graphics or other visuals from stock providers or other third parties may be copied, reused or redistributed only with their owners' prior authorisation). They don't say which photos are the BNR's own.

**Images: a person must confirm.** This changes the earlier research's verdict. That document called Romania *"the most image-friendly launch country"* (§6.8) and followed Commons in marking it "OK" (§6.2), before the BNR's registered-design statement below had been read.
- **Copyright:** Law 8/1996 art. 9(d) excludes *"mijloacele de plată"* (means of payment) from copyright (quoted in the earlier research).
- **Registered designs:** the BNR says ([bancnote și monede](https://www.bnr.ro/662-bancnote-si-monede)):
  > "Designul bancnotelor şi monedelor este înregistrat la O.S.I.M. și este protejat conform Legii nr. 129/1992 privind protecția desenelor şi modelelor. Banca centrală are un drept exclusiv de utilizare a acestuia şi de a împiedica utilizarea de o terță parte care nu dispune de consimțământul său."

  ("The design of banknotes and coins is registered with OSIM and protected under Law 129/1992 on designs. The central bank has the exclusive right to use it and to stop a third party without its consent from using it.")
- **Law 312/2004 art. 14(5)** (read on a third-party mirror, [legeaz.net](https://legeaz.net/legea-312-din-2004-statutul-bnr/art-14-insemnele-monetare-emisiunea-monetara)):
  > "Orice reproducere color a acestora, la scara 1/1, parţială sau integrală, în scop publicitar, de informare sau în alte scopuri comerciale se poate face numai cu acordul prealabil, scris, al Băncii Naţionale a României."

  ("Any colour reproduction of them at 1:1 scale, partial or whole, for advertising, information or other commercial purposes may be made only with the BNR's prior written consent.")
- **What this means:** reduced-size images fall outside art. 14(5) as written. Whether the registered-design claim reaches catalogue thumbnails can't be settled from the texts, so ask the BNR or counsel ([§6](#6-questions-for-a-person)).
- **Commons** tags Romanian money `{{PD-RO-exempt}}` and has [Coins of Romania](https://commons.wikimedia.org/wiki/Category:Coins_of_Romania) and [Banknotes of Romania](https://commons.wikimedia.org/wiki/Category:Banknotes_of_Romania) (with subcategories per series: Leu 1991, Leu 1996 polymer, Leu 2005).

**Effort: M (about 2 days).**
- The catalogue: a script reading `/getpaginare` and the detail pages, plus clean-up.
- About 12 circulation coins and notes and 5 polymer notes, by hand.
- Notes stay in Romanian (`notes_language` `ro`), with CoinsLite's credited translations as in the US dataset.

### 3.4 United States

**Data**
- **Per-coin pages**, for example the [Delaware quarter](https://www.usmint.gov/learn/coins-and-medals/circulating-coins/quarter/50-state-quarters/delaware), under `/quarter/50-state-quarters`, `/america-the-beautiful-quarters`, `/american-women-quarters` and `/dollar/…`.
  - Fields: year, authorising law, release date in prose, both sides described, inscriptions, mints, and *"Artist Credits"* with roles.
  - Coverage: 50 State Quarters (1999–2008), DC & Territories (6, 2009), America the Beautiful (56, 2010–2021), American Women Quarters (20, 2022–2025), Presidential $1 and Native American $1. That's about 190 designs. One entry per design and mint (P and D, plus W for some 2019–2020 quarters) gives about 400.
- **Specifications:** [coin specifications](https://www.usmint.gov/learn/coins-and-medals/circulating-coins/coin-specifications) gives composition, weight, diameter, thickness and edge per denomination.
- **Mintages:** the [circulating coins production report](https://www.usmint.gov/about/production-sales-figures/circulating-coins-production) is interactive ("by denomination as well as by program"). It wasn't verified whether its download covers 1999 onwards.
- **Access:** usmint.gov returns 403 to automated requests. These pages were read from Wayback copies, and a dataset script needs a browser or the Wayback copies.
- **Banknotes:** the BEP's [annual production reports](https://www.bep.gov/currency/production-figures/annual-production-reports/) give notes printed per denomination and fiscal year. Series and signatures are on [uscurrency.gov](https://www.uscurrency.gov/denominations/bank-note-identifiers). These facts are too thin for a Catalog worth browsing, so US banknotes aren't shortlisted.

**Licence (data): Allowed (public domain).** This is the basis of the bundled Morgan and Peace dataset.
- [17 U.S.C. § 105(a)](https://www.law.cornell.edu/uscode/text/17/105): *"Copyright protection under this title is not available for any work of the United States Government"*.
- The Mint's [terms of use](https://www.usmint.gov/resources/terms-of-use) still apply to using the website itself (*"You may not use this Web site for trading, sales or commercial purposes other than for making purchases from the United States Mint"*). They don't create rights in public-domain facts.
- 18 U.S.C. § 709 bars using "United States Mint" in a way that implies endorsement.

**Images: allowed only for some designs.** From the Mint's [image library](https://www.usmint.gov/news/image-library) (*Wayback copy*): *"At this time, the United States Mint is not accepting any new applications for commercial licenses."*

It links four design-use policies, all read from Wayback copies: [circulating coins](https://www.usmint.gov/news/image-library/circulating-coin-design-use-policy), [50 State Quarters](https://www.usmint.gov/news/image-library/50-state-quarters-design-use-policy), [DC & Territories](https://www.usmint.gov/news/image-library/dc-and-territories-quarters-design-use-policy) and [Presidential $1](https://www.usmint.gov/news/image-library/presidential-dollar-coin-design-use-policy).
1. **Circulating coin designs:** the Mint *"will not object to use of the obverse or reverse design"* of a listed set of older designs, credited *"United States Mint image."* This policy excludes the Sacagawea dollar, the 50 State Quarters and the Westward Journey nickels.
2. **50 State Quarters:** *"will not object to use of the obverse or reverse design of any 50 State Quarters Program coin"*. The policy also notes that "50 State Quarters" is a registered trademark of the Mint (*search excerpt*). Use it only descriptively, as a series name.
3. **DC & Territories:** all six designs, but *"Individual components of a coin's reverse design … may not be extracted"*.
4. **Presidential $1:** obverse, reverse and edge. Credit only for *"noncommercial educational purposes … No credit should be provided for any other use."*

Designs the Mint commissioned from outside artists (its Artistic Infusion Program) are assigned to it, so they aren't public domain. Its 2026 terms and conditions say *"All design submissions to the United States Mint shall be assigned to the United States Mint and will become its sole and exclusive property"* ([AIP terms](https://www.usmint.gov/content/dam/usmint/news/call-for-artists/TermsAndConditions.pdf), C.3(a)). Without a policy covering them, these can't be shown:
- most America the Beautiful reverses from 2011 to 2021;
- the American Women Quarters reverses;
- many Native American $1 reverses;
- the Sacagawea obverse.

The design permission isn't a photo licence. The Mint's own photos include work by a contractor in which it reserves rights, according to [Commons' essay on US coins](https://commons.wikimedia.org/wiki/Commons:Determining_if_U.S._coins_are_free_to_use). So images for these programmes need their own pass: free photos from Commons ([§4.3](#43-wikimedia-commons-in-practice)), design by design, checked against each coin's artist credits.

**Effort: M–L (about 3 days)**, because the Mint's site needs a browser or Wayback copies. Mintages come later if the production report's download covers the years.

### 3.5 Finland

**Data**
- **[Finlex](https://www.finlex.fi/fi/avoin-data):** each collector or commemorative coin has a Ministry of Finance decree giving denomination, alloy and fineness, diameter, weight, edge, finish, the designer's initial, the mint mark, the design described, and an image.
  - Example: [decree 288/2025](https://finlex.fi/api/media/statute/676208/mainPdf/main.pdf), the Erik Allardt €20 silver coin.
  - Decrees are served as Akoma Ntoso XML through a REST API (`opendata.finlex.fi`). The list endpoint returns at most 10 per call, so the number of coin decrees and how far back they go must be counted when building.
  - Full designer names and mintages are often missing.
- **The Bank of Finland:** its [notes and coins as images](https://www.suomenpankki.fi/fi/raha-ja-maksaminen/eurosetelit-ja-kolikot/setelit-ja-kolikot-kuvina/) page names the euro national sides' designers and the mint marks by period. Its mintage table is credited to the Mint of Finland. Neither may be stored (licence below).

**Licence (data)**
- **Finlex: Allowed with attribution (CC BY 4.0).** From the [Finlex FAQ](https://www.finlex.fi/fi/ukk):
  > "Finlexissä avoimena datana julkaistava aineisto on lisensoitu Creative Commons Nimeä 4.0 (CC BY 4.0) -lisenssillä."

  ("Material published as open data in Finlex is licensed under Creative Commons Attribution 4.0 (CC BY 4.0).") The FAQ also says its material carries *"ei … käyttörajoituksia"* (no restrictions on use), apart from not using personal data harmfully.
  - CC BY 4.0 allows storing, changing and commercial use, with attribution and changes indicated (§3(a)(1)).
  - Statutes are also outside copyright under the Finnish Copyright Act §9.
- **The Bank of Finland website: Not allowed beyond quotation.** From its [terms](https://www.suomenpankki.fi/fi/kayttoehdot/):
  > "Verkkopalvelussa olevaa aineistoa voi lainata rajoitetusti tekijänoikeuslain mukaisella tavalla."

  ("Material in the online service may be quoted to a limited extent, as the Copyright Act allows.")

**Images: markka coins free; euro and collector coins need a person to confirm.**
- **For:** the Copyright Council's statement 1989:13 ([okm.fi](https://okm.fi/documents/1410845/3974201/Lausunto+1989-13+Laki,+kolikko)):
  > "Koska liikkeelle laskettavien kolikoiden kuvat julkaistaan kuitenkin Suomen säädöskokoelmassa asetuksen osana ja koska tekijänoikeuslain 9 §:n mukaan lakeihin ja asetuksiin ei ole tekijänoikeutta, ei kolikon kuva ole tekijänoikeudellisesti suojattu."

  ("Because the images of coins put into circulation are published in the Statute Book as part of a decree, and laws and decrees have no copyright under §9 of the Copyright Act, the coin image is not protected by copyright.")

  The statement was made in 1989 about markka coins, so markka coin designs are free.
- **Against, for euro coins:** the Commission's 2019 file on the national sides of euro circulation coins says *"Ministry of Finance has copyrights. Reproduction is possible with the permission of Ministry of Finance"* and *"copyright law (Ministry of Finance has copyrights based on contracts)"*. Whether the 1989 reasoning still frees euro and collector coin images published in decrees is the question for the Ministry ([§6](#6-questions-for-a-person)).
- **Markka banknotes:** protected where the designer died less than 70 years ago (the Bank of Finland's [2023 guide](https://www.suomenpankki.fi/globalassets/bof/fi/raha-ja-maksaminen/eurosetelit-ja--kolikot/rahojen-aiheiden-kaytto---ohje-17.11.2023.pdf)).

**Effort: M (2–3 days)** to list and parse the coin decrees from the Finlex API.

### 3.6 Denmark

**Data**
- **Current coins** ([møntrækken](https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/danske-moenter-i-dag/moentraekken)): 50 øre to 20 kr, with material, diameter, weight, edge, date into circulation, portrait artist and earlier versions.
- **[Special series](https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/saerlige-moentserier):** commemorative coins and five theme series from 2002–2013, about 30 specification blocks.
- **[Historical banknotes](https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/historiske-sedler):** series since 1819, but in prose without dimension or date tables. Hand-curated banknote entries would need another source for their dates.

**Licence: Allowed with attribution, no changes to the material.** From [ophavsret](https://www.nationalbanken.dk/da/juridiske-oplysninger/ophavsret), checked 2026-10-12:
> "Det er tilladt vederlagsfrit at kopiere materiale fra hjemmesiden - såvel elektronisk som i papirform - forudsat at Danmarks Nationalbank udtrykkeligt anføres som kilde. Det er ikke tilladt at ændre eller forvanske materialets indhold."

("Copying material from the website free of charge, electronically or on paper, is allowed provided Danmarks Nationalbank is expressly given as the source. Changing or distorting the material's content is not allowed.")

Commercial use isn't excluded. These terms match Norges Bank's, which the Norway dataset already relies on: CoinsLite stores the facts unchanged in their own fields and writes its own notes.

**Images: Not OK.**
- The [reproduction rules](https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/regler-for-gengivelse-af-pengesedler-og-moenter) say *"Nationalbankens ophavsret til sedlerne og mønternes design skal respekteres"* (the Nationalbank's copyright in the notes' and coins' design must be respected).
- Banknotes may be shown electronically at no more than 200 px high.
- State symbols and the monarch's portrait need permission from the National Archives (Rigsarkivet) and the Royal Court respectively.
- Commons marks Denmark "Not OK", apart from designs whose artist died 70+ years ago.

**Effort: S (about 1 day)**, about 60 entries by hand.

### 3.7 Iceland

- **Data:** valid coins (1–100 kr) and notes (500–10,000 kr), plus the 1981 notes withdrawn later, on cb.is. That's about 15 entries. The pages render only in a browser, and older series aren't listed.
- **Licence: Allowed with attribution, no changes.** From the [copyright and disclaimer](https://cb.is/copyright-and-disclaimer/) page (*Wayback copy*, 2026-06-21): *"Material on the Central Bank of Iceland's website may be freely accessed, stored, copied, and distributed, provided that the source is cited and that information is not changed or distorted."*
- **Images:** [Commons](https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/Iceland#Currency) says *"Copyrights for coins designed after December 31, 1955 are held by the Central Bank of Iceland."*
- **Not shortlisted:** too few entries for the effort of rendering the pages, and nothing before the current series.

### 3.8 Sweden

**Data**
- **Banknotes:** valid and invalid notes, including a page per denomination for notes that became invalid before 2016. Each type has printing years, last valid date, size and both sides' motifs, back to the 1890s.
- **Coins:** valid coins with full specifications, and the last legal-tender dates of the öre and krona coins.
- **[Commemorative coins](https://www.riksbank.se/sv/betalningar--kontanter/sedlar--mynt/mynt/minnesmynt/1900-talet/)** by century, with denomination, metal, weight, diameter, number sold, artist and mint.
- **Gaps:** no yearly circulation mintages. All of it is HTML only.

**Licence: Unclear.** The site has no copyright notice for these pages. The only reuse clause is on the [open data page](https://www.riksbank.se/sv/om-riksbanken/om-webbplatsen/oppna-data--information-tillganglig-for-vidareutnyttjande/), checked 2026-10-12:
> "Riksbankens öppna data är fritt tillgänglig och får vidareutnyttjas utan att något särskilt medgivande eller avtal krävs. Ange källa, Sveriges riksbank och datum."

("The Riksbank's open data is freely available and may be reused without any special consent or agreement. Give the source, Sveriges riksbank, and the date.")

That page lists the data it covers: the archive, the diary, publications and reports, decisions and similar, and statistics. The notes and coins pages aren't among them. A person should ask the Riksbank (registratorn@riksbank.se) whether the clause covers them.

**Images: Not free.**
- Banknote motifs *"are based on works of art … that are protected by copyright"* ([copying and advertising](https://www.riksbank.se/en-gb/payments--cash/notes--coins/copying-and-advertising/)).
- The images on its notes and coins pages *"får inte användas i kommersiella syften"* (may not be used for commercial purposes; [image bank](https://www.riksbank.se/sv/press-och-publicerat/presskontakt/bildbank/)).
- The Riksbank says its *"coins do not feature any motifs based on protected works of art"*, but Commons still marks Swedish currency "Not OK" because of the designers' moral rights.

**Effort: M (about 2 days) once confirmed**, scraping about 25 pages.

### 3.9 United Kingdom

**Data**
- **Royal proclamations in The Gazette**, for example the [Beatrix Potter 50p](https://www.thegazette.co.uk/notice/2712446).
  - Each gives the denomination, metal and fineness, standard weight and tolerance, diameter, edge, shape, obverse inscription and the reverse design in words. No designer or mintage.
  - Every coin issued under the Coinage Act 1971 s.3 has one.
  - Notices are served as HTML, PDF and `data.xml`, with a [linked-data API](https://www.thegazette.co.uk/data).
  - Commemorative and proof notices have to be filtered out.
- **The Coinage Act 1971, Schedule 1** on legislation.gov.uk: its specification table is an image, and later proclamations aren't consolidated into it. Low value.
- **The Royal Mint's [mintage figures](https://www.royalmint.com/collect/collector-resources/uk-coin-mintage-figures/)** are the best UK dataset: 538 records, 1968–2025, ½p to £2, served as JSON. Their licence blocks reuse (below).
- **The Bank of England's [withdrawn](https://www.bankofengland.co.uk/banknotes/withdrawn-banknotes) and current banknotes:** first issued and last legal tender dates, colour, size and design. Their licence blocks reuse (below).

**Licences**
- **The Gazette: Allowed with attribution (OGL v3.0).**
  - The Gazette's [terms](https://www.thegazette.co.uk/terms-and-conditions): *"All content is available under the Open Government Licence v3.0, except where otherwise stated."*
  - The [OGL v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) lets you *"copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially"*.
  - Attribution: *"Contains public sector information licensed under the Open Government Licence v3.0."*
  - It excludes *"other intellectual property rights, including patents, trade marks, and design rights"*, which matters for images, not facts.
- **The Royal Mint: Written licence.** Its [terms of use](https://www.royalmint.com/terms/terms-of-use/) say *"You must not use any part of the content on our site for commercial purposes without obtaining a licence"*.
- **The Bank of England: Written licence.** Its [legal page](https://www.bankofengland.co.uk/legal) allows use *"for personal use or internal use within an individual organisation for non-commercial purposes"*. Only its statistical database is under the OGL.

**Images**
- **Coins: Not OK.** The Royal Mint's [advertising guidelines](https://www.royalmint.com/aboutus/policies-and-guidelines/advertising-guidelines/), checked 2026-10-12, say *"Copyright for designs and images of United Kingdom decimal coins subsists in the Crown"* and *"we do not routinely grant permission for UK coinage designs to be used by third parties for commercial purposes"*.
- **Old designs:** Crown copyright in a commercially published work ends 50 years after publication ([CDPA s.163](https://www.legislation.gov.uk/ukpga/1988/48/section/163)). Commons says Crown-copyright sculptures *"created more than 50 years ago are now in the public domain"*. But designs by outside artists that were only assigned to the Crown may get the normal life-plus-70 term instead. Whether that frees the 1968–1971 decimal designs is a question for counsel.
- **Banknotes:** the Bank of England [gives consent](https://www.bankofengland.co.uk/banknotes/using-images-of-banknotes) to reproduce its notes under conditions: *"SPECIMEN"* across images showing more than half of a side, and *"no distortion to the monarch's image"*. It states *"Copyright in Bank of England banknotes is owned by the Bank of England"*. Relying on that consent would be a product decision, not a "clearly free" design.

**Effort: L (3–5 days)**, listing and parsing the proclamations for circulating coins.

---

## 4. Images

### 4.1 What a Catalog image needs

A Catalog image may be shown only when all three of these hold:
1. **The design is free:**
   - public domain (for example US federal works);
   - excluded from copyright (Finnish markka coins; Romanian money and Finnish euro coin decree images only once §6 is answered);
   - expired (the artist died more than 70 years ago, or Crown copyright older than 50 years);
   - or covered by an explicit permission (euro banknotes, US Mint design policies).
2. **The photo is free:** a photo of a coin can carry its own copyright, separate from the design's (DSM Directive art. 14 covers only reproductions of two-dimensional public-domain works; see the earlier research §6.2). Acceptable photos are public domain, CC0, CC BY or CC BY-SA, or the issuer's own image under a permission that covers it.
3. **Reproduction rules for banknotes are kept:**
   - euro: SPECIMEN, ≤72 dpi;
   - Norway: SPECIMEN, ≤72 dpi;
   - Denmark: ≤200 px high;
   - US: smaller than 75% or larger than 150% of real size, one-sided ([31 CFR 411.1](https://www.ecfr.gov/current/title-31/subtitle-B/chapter-IV/part-411/section-411.1));
   - UK: the Bank of England's conditions.

### 4.2 By country

A summary of each section's image verdict in §3; the sections hold the quotes.

| Country or series | Coins | Banknotes |
|---|---|---|
| Euro common side | **OK, flat** (COM(2001) 600) | – |
| Euro national sides | **Not OK** anywhere without the country's consent. Closest: the Netherlands ("no restrictions … but the Ministry may in certain cases prohibit"), Slovenia | – |
| Euro banknotes | – | **OK**: the ECB's 72 dpi SPECIMEN files, unmodified |
| Romania | Design excluded from copyright; registered-design claim and art. 14(5) consent: **ask the BNR** | Same |
| United States | **OK** for designs by Mint employees and those published before 1 March 1989; **OK under Mint policy** for 50 State Quarters, DC & Territories, Presidential $1; **Not OK** for assigned designs (most ATB 2011–2021, American Women reverses, many Native American reverses, Sacagawea obverse) | **OK** within the size and one-sided rule; whether 31 CFR 411.1's "destroyed and/or deleted" condition fits a web app is a product decision |
| Finland | Markka coins **OK** (Copyright Council 1989:13); euro and collector coins **ask** the Ministry of Finance | Markka notes **Not OK** unless the designer died 70+ years ago |
| Denmark | **Not OK** (bank's copyright; state symbols and portrait need permission) | **Not OK**; ≤200 px rule |
| Iceland | **Not OK** for designs after 1955 | **Not OK** |
| Sweden | **Unclear** (Riksbank: no protected motifs; Commons: Not OK) | **Not OK** |
| United Kingdom | **Not OK** (Crown copyright, Royal Mint); pre-1976 designs **ask counsel** | Bank of England consent with conditions: a product decision |
| Norway (existing) | **Consent needed** (earlier research §6.5) | Same |

### 4.3 Wikimedia Commons in practice

- **Licences are per file.** Files of coins usually carry two licences: the photographer's and the design's. For example, [1893-S Morgan dollar obverse.jpg](https://commons.wikimedia.org/wiki/File:1893-S_Morgan_dollar_obverse.jpg) has `{{self|cc-by-sa-4.0}}` and `{{PD-USGov-money}}`, and is in both Category:CC-BY-SA-4.0 and Category:PD US money.
  - The API's `extmetadata` for that file reports `LicenseShortName: Public domain` and `AttributionRequired: false` (queried 2026-10-12).
  - An importer that trusted `extmetadata` would drop a required attribution and share-alike licence. It must read every licence template or category, and apply the most restrictive one: the photo's.
- **What attribution needs:**
  - Commons' [reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia): *"If the uploader is not the content creator, it is the content creator who must be credited, not the uploader"*, and public-domain files *"may not have a strict legal requirement of attribution"* but *"attribution is recommended to give correct provenance"*.
  - CC BY-SA 4.0 §3(a)(1) requires:
    - the creator's name;
    - a copyright notice;
    - a link to the licence;
    - a link to the material *"to the extent reasonably practicable"*;
    - an indication of any modification.

    The Catalog's image credit (source, author, licence, link) holds all of these. The link goes to the file page.
- **Format changes don't trigger share-alike.** CC 4.0 §2(a)(4) permits *"technical modifications necessary"* to use the material in other formats, and *"simply making modifications authorized by this Section 2(a)(4) never produces Adapted Material"*. Converting to WebP and resizing are such modifications, so they don't oblige CoinsLite to license anything under BY-SA beyond the image itself.
- **Hotlinking:** Commons' [technical reuse page](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/technical) says *"Hotlinking is allowed from Wikimedia servers, but is not generally recommended"*, because a hotlinked file can be changed or deleted. Copy the file into CoinsLite's own storage through the existing WebP pipeline, keep its credit, and link the file page.
- **Coverage, US silver dollars:**
  - [Category:Morgan dollar](https://commons.wikimedia.org/wiki/Category:Morgan_dollar) has 98 files and [Category:Peace dollar](https://commons.wikimedia.org/wiki/Category:Peace_dollar) has 42 (2026-10-12).
  - Some are named by date and mint ("1893-S Morgan dollar obverse.jpg"). Others are graded-slab photos or unrelated.
  - Per-date categories are rare (4 for Morgan, 1 for Peace).
  - So matching files to Catalog entries is curation, not a join. Expect images for well-photographed dates first, plus one representative image per series grouping.
- **Other useful categories:**
  - US: [PD US money](https://commons.wikimedia.org/wiki/Category:PD_US_money), [50 State Quarters](https://commons.wikimedia.org/wiki/Category:50_State_Quarters).
  - Nordic: [Coins of Sweden](https://commons.wikimedia.org/wiki/Category:Coins_of_Sweden), [Coins of Denmark](https://commons.wikimedia.org/wiki/Category:Coins_of_Denmark), [Finnish markka](https://commons.wikimedia.org/wiki/Category:Finnish_markka), [PD Icelandic currency](https://commons.wikimedia.org/wiki/Category:PD_Icelandic_currency). Use these for designs whose artist died 70+ years ago.
  - Romania: the categories in §3.3.

### 4.4 Museums

- **Smithsonian Open Access** (CC0, per [the AWS open data registry](https://registry.opendata.aws/smithsonian-open-access/)):
  - Its API (`api.si.edu/openaccess`, queried 2026-10-12) returns 462,356 records from the National Numismatic Collection, but only about 210 with an online image.
  - The Morgan dollar records found had none.
  - It's useful for single gaps, not as a source. (The Smithsonian's own FAQ and terms pages blocked automated reading.)
- **DigitaltMuseum** (Norway; licence per object) is covered in the earlier research (§6.11).

### 4.5 The credit each source needs

| Source | Credit to record (source / author / licence / link) |
|---|---|
| ECB (facts and text) | European Central Bank; the licence text used in `euroCommemoratives.ts`: reused citing the ECB, free of charge at www.ecb.europa.eu, changes stated |
| ECB banknote images | European Central Bank; "Reproduced under Decision ECB/2013/10, specimen image, 72 dpi"; link to the ECB images page |
| BNR | Banca Națională a României; "Redistribuit cu indicarea sursei; informațiile sunt disponibile gratuit pe www.bnr.ro" plus any change stated; link to the page |
| US Mint (facts) | United States Mint; "Public domain (17 U.S.C. § 105)", as in `usSilverDollars.ts` |
| US Mint (design policy images) | "United States Mint image" where the policy asks for it; none for Presidential $1 outside education |
| Finlex | Finlex, Ministry of Justice of Finland; "CC BY 4.0", with changes indicated; link to the decree |
| Danmarks Nationalbank | "Kilde: Danmarks Nationalbank"; copied unchanged |
| Central Bank of Iceland | "Source: Central Bank of Iceland"; unchanged |
| Sveriges riksbank (if confirmed) | "Källa: Sveriges riksbank" and the date |
| The Gazette | "Contains public sector information licensed under the Open Government Licence v3.0."; link to the notice |
| Bundesbank | "Quelle: Deutsche Bundesbank"; unchanged |
| Wikimedia Commons file | the photographer (not the uploader), the most restrictive licence on the file with its URL, the file page, and "resized and converted to WebP" |

---

## 5. Turning a source into a Catalog CSV

All three bundled datasets work the same way, and new ones should too:
- **One TypeScript module per dataset** in `packages/backend/convex/catalog/datasets/`. It builds rows as objects and writes them through `formatCsvRecord(catalogCsvColumns…)`.
- **Credit on every row**, through a `credit("facts" | "notes", provenance)` helper, so the CSV import's `checkNode` finds source, author, licence and link for every group that holds data.
- **A rebuild script for sources fetched in bulk**, for example `scripts/fetch-euro-commemoratives.ts`, which is run by hand and reviewed as a diff, never on a deployment.
- **Registration in `catalog/seed.ts`**: the `datasets` map and the `loadDataset` argument union.

| Column | Euro coins | Euro banknotes | Romania (BNR) | US programmes | Finland (Finlex) | Denmark | UK (Gazette) | Sweden |
|---|---|---|---|---|---|---|---|---|
| `item_type` | coin | banknote | coin / banknote | coin | coin | coin | coin | banknote / coin |
| `country` | issuer (AT…VA) | none (Theme) | RO | US | FI | DK | GB | SE |
| `denomination` | "2 euro", "50 cent" | "5 euro" | "50 bani", "10 lei" | "25 cents", "1 dollar" | "20 euro" | "20 kroner" | "50 pence" | "100 kronor" |
| `series` | design series | First / Europa | issue or theme | programme | – | series name | – | series |
| `year_from` / `year_to` | first year / last (or open) | issue year | issue year | year | year | years | proclamation year | printing years |
| `material`, `composition` | bimetallic / Nordic gold (aluminiumBronze) / copper-plated steel (steel); % from Reg. 975/98 | – | metal (e.g. silver 999) | per denomination spec | alloy + fineness | material | metal + fineness | coins only |
| `metal`, `fineness`, `weight_g`, `diameter_mm`, `thickness_mm` | specs page | – | detail page | specs page | decree | page | proclamation | coin pages |
| `width_mm`, `height_mm` | – | ECB/2013/10 | banknote pages | – | – | – | – | note pages |
| `edge`, `edge_lettering` | specs; €2 lettering from text | – | "Margine" | specs | decree | page | proclamation | coin pages |
| `mint`, `mint_mark` | – (later) | – | – | P / D / W | mint mark in decree | – | – | mint (commemoratives) |
| `designers` | from text | Europa: from the ECB design page | – | Artist Credits | initial only; full names where given | portrait artist | – | artist |
| `mintage` | – | – | "Tiraj maxim" is a maximum, keep in notes | production report if it goes back | – | – | – | "Antal sålda" in notes |
| `issue_date`, `withdrawal_date` | – | issue date; none withdrawn | circular dates | release date | – | date into circulation | – | last valid date |
| `technical_details`, `historical_notes` | ECB text (+ de/fr/ro pages) | colour, style | Romanian text, `notes_language` ro | Mint text | decree text (fi), `notes_language` fi | CoinsLite's own notes (the bank's text may not be changed) | proclamation text | Swedish text |
| `facts_*` / `notes_*` | ECB | ECB | BNR | US Mint | Finlex | facts: Danmarks Nationalbank; notes: CoinsLite editorial | The Gazette | Sveriges riksbank |
| `image_*` | – | ECB specimen | – | – | – | – | – | – |

---

## 6. Questions for a person

1. **Romanian images (BNR or counsel):** does the BNR's registered-design right (Law 129/1992), together with Law 312/2004 art. 14(5), stop a commercial catalogue from showing reduced-size images of Romanian coins and notes? And are the photos on bnr.ro the BNR's own (reusable with the source named) or third-party stock?
2. **Finnish coin images (Ministry of Finance, viestinta.vm@gov.fi):** may images from coin decrees be shown commercially? The 1989 Copyright Council statement says yes; the Commission's 2019 file says the Ministry holds copyright by contract.
3. **Sweden (registratorn@riksbank.se):** does the open-data clause (*"får vidareutnyttjas utan att något särskilt medgivande eller avtal krävs"*) cover the notes and coins pages?
4. **UK designs from before 1976 (counsel):** are the 1968–1971 decimal designs Crown copyright that expired 50 years after publication, or assigned works under the life-plus-70 term?
5. **US banknote images (product):** can a web app meet 31 CFR 411.1's condition that files be *"destroyed and/or deleted or erased after their final use"*?
6. **Euro coin national sides:** ask the Netherlands and Slovenia first, as the most open. The 2-euro commemoratives would gain their images too.

---

## 7. Not evaluated / gaps

- **Per-year mintages for euro coins** outside Germany, and whether the US Mint's production report downloads go back to 1999.
- **Older series:**
  - Romanian withdrawn issues from 1991–2000 (the pages redirect to the homepage);
  - Danish banknote dates;
  - Swedish coins before the current series (Riksbank pages cover only recent and commemorative issues);
  - Finnish markka circulation coins (only a copyrighted book was found).
- **Finland:** the Mint of Finland's site didn't resolve on 2026-10-12.
- **Pages read indirectly:**
  - The US Mint's image-use policies and the Iceland pages were read from Wayback copies.
  - Law 312/2004 was read on a third-party mirror.
  - EUR-Lex blocked automated reading of ECB/2013/10, so the legislation.gov.uk copy was used.
  - The Smithsonian's own FAQ and terms pages blocked automated reading.
- **Other countries** (Germany beyond mintages, France, Switzerland, Poland) were out of scope this pass.

---

## Sources

All accessed **2026-10-12** unless noted.

**European Central Bank and European Commission**
- https://www.ecb.europa.eu/services/disclaimer/html/index.en.html (ECB copyright and reuse)
- https://www.ecb.europa.eu/euro/coins/2euro/html/index.en.html (and the 1euro, 50cents, 20cents, 10cents, 5cents, 2cents, 1cent pages)
- https://www.ecb.europa.eu/euro/coins/common/html/index.en.html (common sides and specifications)
- https://www.ecb.europa.eu/euro/changeover/2002/html/index.en.html
- https://www.ecb.europa.eu/euro/banknotes/images/html/index.en.html (use of euro banknote images; specimen zip)
- https://www.ecb.europa.eu/euro/banknotes/images/html/ecb.faq_reproduction_rules_euro_banknotes.en.html
- https://www.ecb.europa.eu/euro/banknotes/current/html/index.en.html
- https://www.ecb.europa.eu/euro/banknotes/current/design/html/index.en.html
- https://www.ecb.europa.eu/press/pr/date/2013/html/pr130110_1.en.html, https://www.ecb.europa.eu/press/pr/date/2014/html/pr140113.en.html, https://www.ecb.europa.eu/press/pr/date/2015/html/pr150224.en.html, https://www.ecb.europa.eu/press/pr/date/2016/html/pr160705.en.html, https://www.ecb.europa.eu/press/pr/date/2016/html/pr160504.en.html, https://www.ecb.europa.eu/press/pr/date/2018/html/ecb.pr180917.en.html
- https://www.ecb.europa.eu/stats/policy_and_exchange_rates/banknotes+coins/circulation/html/index.en.html
- https://www.legislation.gov.uk/eudn/2013/10/article/1/data.htm (Decision ECB/2013/10, Art. 1, retained copy)
- https://www.legislation.gov.uk/eudn/2011/833/article/3/data.htm and https://www.legislation.gov.uk/eudn/2011/833/article/6/data.htm (Commission Decision 2011/833/EU on reuse, retained copy; EUR-Lex blocked automated reading)
- https://economy-finance.ec.europa.eu/euro/euro-coins-and-notes/copyright-and-reproduction-rules-euro-coins-and-notes_en
- https://economy-finance.ec.europa.eu/document/download/2d5c4f98-07e0-450c-995a-d1655af47c72_en?filename=copyright_national_sides_euro_coins_info_for_europa_website.xlsx (10 September 2019)

**Germany and Finland (mintages)**
- https://www.bundesbank.de/de/startseite/benutzerhinweise/nutzungsbedingungen-fuer-den-allgemeinen-gebrauch-der-website-763554
- https://bundesbank.de/resource/blob/623770/a397abd6916e0f2943172eac31711a58/mL/praegung-euro-umlaufmuenzen-data.pdf (search excerpt; not read)
- https://www.suomenpankki.fi/en/money-and-payments/euro-banknotes-and-coins/number-of-minted-finnish-coins/
- https://www.suomenpankki.fi/en/disclaimer/

**Romania**
- https://www.bnr.ro/2281-termeni-si-conditii (read through `POST /blocks`, block 3854)
- https://www.bnr.ro/662-bancnote-si-monede
- https://www.bnr.ro/2271-monede-si-medalii, https://www.bnr.ro/2267-monede-in-circulatie, https://www.bnr.ro/764-bancnote-in-circulatie, https://www.bnr.ro/762-emisiuni-retrase-din-circulatie, https://www.bnr.ro/2275-prima-emisiune-bnr-realizata-din-polimer-2000-2003, https://www.bnr.ro/2638-emisiuni-numismatice
- https://legeaz.net/legea-312-din-2004-statutul-bnr/art-14-insemnele-monetare-emisiunea-monetara (third-party mirror of Law 312/2004 art. 14)
- https://legislatie.just.ro/Public/DetaliiDocument/221527 (Law 8/1996, cited in the earlier research)

**United States**
- https://www.usmint.gov/resources/terms-of-use (October 2016)
- https://www.usmint.gov/news/image-library and its four design-use policies (Wayback copies, July–September 2026):
  - https://www.usmint.gov/news/image-library/circulating-coin-design-use-policy
  - https://www.usmint.gov/news/image-library/50-state-quarters-design-use-policy
  - https://www.usmint.gov/news/image-library/dc-and-territories-quarters-design-use-policy
  - https://www.usmint.gov/news/image-library/presidential-dollar-coin-design-use-policy
- https://www.usmint.gov/learn/coins-and-medals/circulating-coins/quarter/50-state-quarters/delaware (Wayback copy) and the programme pages
- https://www.usmint.gov/learn/coins-and-medals/circulating-coins/coin-specifications
- https://www.usmint.gov/about/production-sales-figures/circulating-coins-production
- https://www.usmint.gov/content/dam/usmint/news/call-for-artists/TermsAndConditions.pdf (AIP terms, 2026)
- https://www.law.cornell.edu/uscode/text/17/105
- https://www.ecfr.gov/current/title-31/subtitle-B/chapter-IV/part-411/section-411.1
- https://www.bep.gov/currency/production-figures/annual-production-reports/
- https://www.uscurrency.gov/denominations/bank-note-identifiers, https://www.uscurrency.gov/media/currency-image-use
- https://www.federalreserve.gov/disclaimer.htm

**Finland**
- https://www.finlex.fi/fi/ukk (licence)
- https://www.finlex.fi/fi/avoin-data (API)
- https://finlex.fi/api/media/statute/676208/mainPdf/main.pdf (decree 288/2025)
- https://www.suomenpankki.fi/fi/kayttoehdot/
- https://www.suomenpankki.fi/fi/raha-ja-maksaminen/eurosetelit-ja-kolikot/setelit-ja-kolikot-kuvina/
- https://www.suomenpankki.fi/globalassets/bof/fi/raha-ja-maksaminen/eurosetelit-ja--kolikot/rahojen-aiheiden-kaytto---ohje-17.11.2023.pdf
- https://okm.fi/documents/1410845/3974201/Lausunto+1989-13+Laki,+kolikko (Copyright Council statement 1989:13)

**Denmark**
- https://www.nationalbanken.dk/da/juridiske-oplysninger/ophavsret
- https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/regler-for-gengivelse-af-pengesedler-og-moenter
- https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/danske-moenter-i-dag/moentraekken
- https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/saerlige-moentserier
- https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/historiske-sedler

**Iceland**
- https://cb.is/copyright-and-disclaimer/ (Wayback copy, 2026-06-21)
- https://cb.is/payments/banknotes-and-coin/valid-coins-in-circulation/
- https://cb.is/payments/banknotes-and-coin/reproduction-and-forgery/ (Wayback copy)

**Sweden**
- https://www.riksbank.se/sv/om-riksbanken/om-webbplatsen/oppna-data--information-tillganglig-for-vidareutnyttjande/
- https://www.riksbank.se/en-gb/payments--cash/notes--coins/copying-and-advertising/ (updated 17 August 2026)
- https://www.riksbank.se/sv/press-och-publicerat/presskontakt/bildbank/
- https://www.riksbank.se/sv/betalningar--kontanter/sedlar--mynt/mynt/minnesmynt/1900-talet/
- https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1960729-om-upphovsratt-till-litterara-och_sfs-1960-729/ (Copyright Act §9)

**United Kingdom**
- https://www.thegazette.co.uk/terms-and-conditions, https://www.thegazette.co.uk/data, https://www.thegazette.co.uk/notice/2712446
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- https://www.legislation.gov.uk/help, https://www.legislation.gov.uk/ukpga/1971/24/schedule/1, https://www.legislation.gov.uk/ukpga/1988/48/section/163
- https://www.royalmint.com/terms/terms-of-use/
- https://www.royalmint.com/aboutus/policies-and-guidelines/advertising-guidelines/
- https://www.royalmint.com/collect/collector-resources/uk-coin-mintage-figures/
- https://www.bankofengland.co.uk/legal
- https://www.bankofengland.co.uk/banknotes/withdrawn-banknotes, https://www.bankofengland.co.uk/banknotes/current-banknotes, https://www.bankofengland.co.uk/banknotes/using-images-of-banknotes

**Wikimedia Commons and licences**
- https://commons.wikimedia.org/wiki/Commons:Currency and the per-country pages `Commons:Copyright_rules_by_territory/<Country>#Currency` (Sweden, Denmark, Finland, Iceland, United Kingdom, United States, Romania)
- https://commons.wikimedia.org/wiki/Commons:Determining_if_U.S._coins_are_free_to_use
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/technical
- https://commons.wikimedia.org/w/api.php (categoryinfo, categories, revisions and imageinfo `extmetadata` queries for Category:Morgan_dollar, Category:Peace_dollar and File:1893-S_Morgan_dollar_obverse.jpg)
- https://creativecommons.org/licenses/by-sa/4.0/legalcode.en (§1, §3(a), §3(b))
- https://creativecommons.org/licenses/by/4.0/legalcode.en (§2(a)(4))

**Museums**
- https://registry.opendata.aws/smithsonian-open-access/ (licence CC0)
- https://api.si.edu/openaccess/api/v1.0/search (record counts, queried with the public demo key)

**CoinsLite repo context**
- `docs/adr/0003-own-catalog-with-storable-sources.md`; `docs/functional-spec.md` §6.1, §6.2, §15; `GLOSSARY.md`
- `packages/backend/convex/catalog/datasets/*.ts`, `catalog/seed.ts`, `catalog/fields.ts` (CSV columns and checks), `scripts/fetch-euro-commemoratives.ts`
