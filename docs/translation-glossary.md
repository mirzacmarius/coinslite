# Translation glossary

How CoinsLite's domain terms ([`CONTEXT.md`](../CONTEXT.md)) read in each launch language. Use these words, and only these, wherever the term appears: in the app's dictionaries (`apps/app/src/locales/*.ts`) and in what the server writes (emails, the Collection CSV and PDF, the Insurance report, release notes).

| Term | Norsk bokmål | Deutsch | Français | Română |
|---|---|---|---|---|
| Item | objekt | Objekt | objet | obiect |
| Item type | objekttype | Objektart | type d’objet | tip de obiect |
| Quantity | antall | Anzahl | quantité | cantitate |
| Collection | samling | Sammlung | collection | colecție |
| Album | album (pl. album) | Album (pl. Alben) | album | album (pl. albume) |
| Grade | kvalitet | Erhaltung | état | stare |
| Grading scale | kvalitetsskala | Bewertungsskala | échelle de notation | scară de evaluare |
| Strike | preging | Prägung | frappe | batere |
| Catalog | katalog | Katalog | catalogue | catalog |
| Catalog entry | katalogoppføring | Katalogeintrag | entrée du catalogue | intrare de catalog |
| Theme | tema | Thema | thème | temă |
| Set | sett | Set | ensemble | set |
| Wantlist | ønskeliste | Wunschliste | liste de souhaits | listă de dorințe |
| Home currency | hjemmevaluta | Heimatwährung | devise de référence | moneda de bază |
| Purchase price | innkjøpspris | Kaufpreis | prix d’achat | preț de achiziție |
| Market value | markedsverdi | Marktwert | valeur de marché | valoare de piață |
| Spot price | spotpris | Spotpreis | cours spot | preț spot |
| Metal value | metallverdi | Metallwert | valeur du métal | valoarea metalului |
| Gain/loss | gevinst/tap | Gewinn/Verlust | gain/perte | câștig/pierdere |
| Insured value | forsikringsverdi | Versicherungswert | valeur assurée | valoare asigurată |
| Insurance report | forsikringsrapport | Versicherungsbericht | rapport d’assurance | raport de asigurare |
| Free plan | gratisplan | Gratis-Tarif | formule gratuite | plan gratuit |
| Premium | Premium | Premium | Premium | Premium |

Fixed values:

| | Norsk bokmål | Deutsch | Français | Română |
|---|---|---|---|---|
| Coin / banknote / stamp | mynt / seddel / frimerke | Münze / Banknote / Briefmarke | pièce / billet / timbre | monedă / bancnotă / timbru |
| Pieces (of an Item) | stykker | Stück | exemplaires | bucăți |
| Strike: circulation | omløp | Umlauf | circulation | circulație |
| Strike: BU | usirkulert kvalitet (BU) | Stempelglanz (BU) | brillant universel (BU) | necirculat lucios (BU) |
| Strike: proof | proof | Polierte Platte (PP) | belle épreuve (BE) | proof |
| Stamp Grades: MNH / MH / used | postfrisk / ubrukt med hengsel / stemplet | postfrisch / ungebraucht mit Falz / gestempelt | neuf sans charnière / neuf avec charnière / oblitéré | neștampilat, fără șarnieră / neștampilat, cu șarnieră / ștampilat |

## Conventions

- **Capitals.** English capitalises the glossary terms mid-sentence ("your Collection"). The other languages follow their own grammar: lower case in Norwegian, French and Romanian (German capitalises every noun anyway). Sentence case for labels, buttons and headings in every language.
- **Address.** Norwegian, German and Romanian say *du* / *du* / *tu*; French says *vous*.
- **Quotes.** Norwegian «…», German „…“, French « … » (with non-breaking spaces), Romanian „…”. Apostrophes are typographic (’) everywhere.
- **Numbers.** Romanian puts *de* between a number of 20 or more and its noun: "50 de obiecte". Use a `#few` plural form for 2–19 and `#other` (with *de*) for the rest; a fixed limit of 20 or more always takes *de*.
- **Grade codes** (MS-65, XF, 1+) and the Sheldon scale stay as written; their meanings are translated.
- **Not translated.** Catalog data stays as the Catalog has it: entry titles and series names in the issuing country's language, denominations, notes and sources. A country is the exception: a country node is named from its code, in the reader's language. Brand names (Krugerrand, Maple Leaf) stay; a place name in a bullion preset is translated (Wiener Philharmoniker, Philharmonique de Vienne).
- **Countries** are stored as ISO codes and named by the browser's `Intl.DisplayNames` (`formatCountry` in `@coinslite/i18n`), never typed into a dictionary.

## The missing-translation check

`bun run test` fails when any language leaves a text exactly as in English: the app's dictionaries (`apps/app/src/locales/dictionaries.test.ts`) and every server-side `Record<Locale, …>` (`packages/backend/convex/translations.test.ts`; add new ones there). A word a language genuinely shares with English ("Material" in German, "Collection" in French) goes on the short list in `packages/i18n/src/missing-translations.ts`, and only if that language uses it the same way. The same tests check that placeholders survive translation, that quotes are typographic, and (`file-labels.test.ts`) that the CSV and PDFs use the app's words.
