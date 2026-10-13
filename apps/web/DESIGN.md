# CoinsLite marketing site: design

The plan the marketing site (`apps/web`) is built to. Copy lives in `src/i18n/dictionaries/*.ts`, in five languages; terms follow `GLOSSARY.md` and `docs/translation-glossary.md`.

## Brief

- **Subject:** CoinsLite, a web app where collectors record the coins, banknotes and stamps they own: what each Item is, its Grade, what they paid, what it is worth today, which Sets they are completing, and an Insurance report for their insurer.
- **Audience:** careful hobby collectors in Norway, Germany, France, Romania and the US. Many keep their records in pencil on coin flips, in a spreadsheet, or in their head. They value precision, privacy and not losing what they know.
- **Job:** get a collector to create a free account (Free plan, 50 Items, no card). Premium (unlimited Items, exports, Insurance report) is sold on the same page.
- **Constraints:** Next.js 16 App Router with Cache Components, Tailwind 3 and the shared UI package, five languages under `/[locale]`, cookieless OpenPanel, legal pages and a translated 404. No photography of real coins is available, and Catalog images are mostly placeholders, so imagery is drawn.
- **Facts the copy may use** (checked in code, 2026-10-13): CSV import of up to 2,000 rows with headings in any of the five languages; Spot prices for gold and silver every 15 minutes; 16 bullion presets; 8 Home currencies; Sheldon, Norwegian, European, international banknote and stamp scales; Strike apart from Grade; Certification by PCGS, NGC, ANACS, ICG or PMG; stamp catalogue numbers; front, back and up to 6 more photos behind links that expire within the hour; Sets with completion and a Wantlist; selling an Item; value charts; the Peace dollar's 24 dates and mints in the Catalog.
- **Assumptions:** the Catalog's bundled datasets are loaded in production (the copy names the Peace dollar Set as an example only). Example values on the record card and the Insurance report are illustrative and marked as examples.

## Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. The cabinet (material) | CoinsLite is the collector's coin cabinet: shallow drawers, a tray of round recesses for each series, a card label on every drawer. Each section is a drawer pulled out. | Numismatic cabinets: trays of recesses sized to the coins, empty recesses for what is missing, a label frame on every drawer front. | An isometric coin cabinet (anatomy figure): a drawer slides out on its runners, coins seat in the recesses you hold, the readout counts the Set. | 4 / 5 / 3 / 2 |
| B. The flip (process) | Every coin lives in a 2×2 cardboard flip with pencil notes; scrolling turns the pencil into a proper record. | Collectors pencil grade and price on flips. | Handwriting resolving into set type. | 4 / 4 / 4 / 2 (weak for banknotes and stamps) |
| C. Two sides (formal) | Everything comes as obverse and reverse: the worry on one side, the answer on the other. | Coins have two sides. | A drawn coin flipping between sections. | 3 / 3 / 4 / 3 |

**Pick A.** It fits all three Item types (a cabinet holds coins, notes and stamps), explains Sets by its own mechanism, and the anatomy figure makes it a real object rather than a style. From B, one detail: the record card is set like the card under a coin in a cabinet tray.

## Concept card

```
Idea:        Your collection's cabinet: every piece in its place, with the record behind it.
Metaphor:    a numismatic cabinet: drawers, trays of recesses, card labels.
Signature:   Fig 1, an isometric coin cabinet (anatomy, Hero size). A drawer slides out on its
             runners, a coin drops and seats in the next empty recess, the readout counts
             "Peace dollar · 17 of 24". Idle tour; pointer and keys open drawers and add coins.
Emotion:     the calm of everything in its place; the click of a coin seating.
Motion verb: slide out on runners, then seat. Horizontal travel that stops softly (expo.out),
             a small settle at the end. Nothing bounces or spins.
Screenshot:  the hero: "Know exactly what you have." beside the cabinet with one drawer out
             and one recess still empty.
```

## Art direction

**Palette** (a cabinet in an archive: grey board, ink, card labels, the velvet lining of a tray; the velvet is also the brand's coin ring, deepened):

| Role | Hex | Use |
|---|---|---|
| ground (board) | `#F2F2EE` | page |
| paper (card) | `#FAFAF8` | cards, the figure plate, the record card |
| ink | `#151517` | text, buttons |
| muted (graphite) | `#5C5C62` | secondary text, 5.9:1 on board |
| line | `#151517` at 13% | hairlines |
| velvet | `#1D2250` | tray lining: the Sets section, the closing, the page curtain |
| velvet ink / muted | `#ECECF4` / `#A9ACCF` | text on velvet, 15:1 and 7:1 |
| indigo (accent) | `#3B45B5` | focus ring, inline links, the one lit detail; 6.9:1 on board |

No gradients, no glass, no blur. The figure uses the anatomy light theme mapped onto board, paper and ink.

**Type.** Familjen Grotesk (display and headings, 600, tracking −0.045em at display size, −0.03em at headings): a Scandinavian grotesk with an idiosyncratic `y`, `g` and `w`, for a product that starts with Norwegian scales and kroner. Schibsted Grotesk (reading text and UI, 400 to 600). Geist Mono for data only: catalogue numbers, Grades, money in tables, figure corners. Fluid scale: mega `clamp(3.1rem, 1.05rem + 6.6vw, 7.5rem)`, xl `clamp(2.3rem, 1.2rem + 3.9vw, 5rem)`, l `clamp(1.55rem, 1.12rem + 1.75vw, 2.75rem)`, m `clamp(1.15rem, 1.06rem + 0.45vw, 1.45rem)`, body 17 to 18 px at 1.55, small 14, mono labels 12. Tabular figures everywhere numbers line up.

**Grid and rhythm.** 12 columns, gutter `clamp(1rem, 0.6rem + 1.6vw, 2.5rem)`, outer margin equals the gutter, content capped at 1440 px. Text hangs from three lines: column 1, column 5 and column 7. Section padding moods: tight (`8u`), normal (`16u`), airy (`28u`), full viewport (hero only).

**Shape.** Square corners everywhere. Only coins and recesses are round.

**Motion.** One ease family: `expo.out` for entrances and drawers, `expo.inOut` for the page curtain, `power3.out` for hovers. Hover 0.3 to 0.45 s, reveals 1.0 to 1.2 s with 60 ms staggers, the curtain 0.75 s each way. Sections slide in from the left by 32 px while their clip opens, like a drawer coming out. Under reduced motion: native scroll, no reveals, the figure jumps to its targets, the curtain fades.

**Interaction (one treatment per role).**
- Primary buttons: the label slides out to the right on its runner while a copy slides in from the left; the arrow travels. Touch and reduced motion: an ink-to-velvet fill.
- Outlined buttons: an ink fill slides in from the left edge like a drawer front.
- Nav links: an underline draws from the left; the section in view keeps its line.
- Index rows: the row's name slides 10 px to the right and a recess mark fills.
- Inline links: underlined at rest; the line thickens. Utility links (footer, legal): colour and underline only.

**Idle state.** The figure carries the concept at rest: its idle tour opens drawers and seats coins on the GSAP ticker while it is on screen, and stops off screen and under reduced motion. The rest of the page is still at rest on purpose; hovers carry it.

## Composition (home)

```
1 HERO · split frame (100svh)
  [h1 cols 1-6, 2 lines            ] [Fig 1 plate cols 7-12          ]
  [lead, 2 CTAs, note              ] [cabinet, drawer out, readout   ]
2 STATEMENT · statement (airy)
  [label col 1] [t-l paragraph cols 5-12: where collections live today]
3 ONE RECORD · sticky narrative (normal)
  [h2 cols 1-6]
  [chapters 1-5, cols 1-5, scroll] [record card, sticky, cols 7-12  ]
4 VALUE · data/facts (normal)
  [h2 + text cols 1-5] [4 numerals in a 2x2 grid cols 7-12, mono labels]
5 SETS · gallery wall on velvet (airy)
  [h2 cols 1-5, text]  [tray of 24 recesses, top view, 6x4, cols 6-12  ]
6 INSURANCE · asymmetric pair (normal)
  [report sheet cols 1-7, offset down] [h2 + text + Premium mark cols 9-12]
7 ALSO · index list (tight)
  [h2 col 1-4] [rows: name | line, cols 5-12, two columns on desktop]
8 PRIVACY · poster (airy)
  [one line at t-xl across 12 cols] [three short facts under it]
9 PLANS · pair of cards (normal)
  [Free card][Premium card] [currency table + notes]
10 QUESTIONS · list (normal)
  [h2 cols 1-4] [details rows cols 5-12]
11 CLOSING + FOOTER · finale on velvet (airy)
  [t-xl line] [CTA] / footer columns
```

Phone (390 px): every section is one column; the hero stacks h1, lead and CTAs above the plate; the record card shows once, complete, above its chapters; the tray becomes 4 × 6; the report sheet scrolls sideways inside its frame.

## Genericness test

A generic answer to "coin collecting app landing page" lands on navy and gold, a 3D coin render, three feature cards and a phone mockup. Changed: no gold and no mockups; the imagery is one engineering drawing of a real object, the palette comes from archive board and tray velvet, the features are shown as one real record (a Morgan dollar) and one real Set (the Peace dollar's 24 dates and mints), and the decorative `/01` numbering of the old page is gone (the only numbers left are real: steps of a process, catalogue facts).

## Explainer figure (anatomy, `src/components/cabinet/`)

- **Object:** a collector's coin cabinet on a bench: four shallow drawers with card-label frames and bar pulls, a side panel with a raised-panel groove and a carrying handle, a cornice and top board, bun feet on a plinth, a bench with feet, a ruler strip and a maker's plate engraved "CoinsLite". On top stands a card index box: the record behind every piece.
- **Mapping:** a drawer is a Set; its tray is the Set's Catalog entries; a seated coin is an Item you hold; an empty recess is what is missing. Adding a piece drops it into the next empty place, and a new record card drops into the index box: every piece gets its record. The readout counts held of total.
- **Truth:** the second drawer from the top is the Peace dollar Set, 24 recesses (1921 to 1935, every date and mint, as `usSilverDollars.ts` has it); the scarce dates are the missing ones. The other drawers hold 2 euro coins (45 places), banknotes in sleeves (4) and stamps on stock strips (18). The readout counts what is drawn.
- **Painter's order:** bench, cabinet body with the slot voids, then the drawers bottom to top, each clipped to "outside the body, or the front below its own slot" so the part still inside shows only through its slot; a falling piece is drawn between a drawer's tray and its front, outside that clip; then the top board and the card box. Coins share one drawing (`<use>`) with a recess clip, since the projection is affine.
- **Live:** an idle tour on the GSAP ticker opens each drawer in turn and adds one piece (lit while it falls), then one card; it waits while the pointer or focus is inside the figure, resumes 3.6 s after input, has a Pause button (an auto-playing figure has to be stoppable), stops off screen, and under reduced motion the figure holds its first frame and still answers the buttons. Pointing at a drawer opens it, tapping it adds a piece; the drawer buttons and the add button under the drawing do the same from the keyboard, and a polite live region says what changed.

## Decisions made while building

- **Coins have faces.** Outside Fig 1, every coin is the same drawn obverse (`components/coin-face.tsx`): beaded rim, LIBERTY arched over the field, the date and mint mark, so the Set tray reads as a specimen tray. The closing's coin is the 1921, the date still missing from the example Set.
- **The feature index is a card index.** "And everything else" is a set of ruled index cards whose tabs step across, like the cards in Fig 1's box; a card lifts out under the pointer.
- **Phones:** the bar keeps the logo, a short "Start free" and Menu; the languages move into the menu. The record card keeps its title and coins at the top and each step shows the rows it writes, since a sticky card doesn't fit beside the steps.
- **Back and forward** show the page as it was left, with no reveals to wait for (Next keeps the previous page alive and handles the history event first).
- **Unknown addresses** show the translated not-found page with `noindex`, as before, but still answer 200: calling `notFound()` from the prerendered catch-all sends an empty error shell, and the proxy can't set a status on a rewrite. A true 404 needs the not-found route changed in the app's routing, which is outside this redesign.

## Idle state

The figure is the concept and keeps moving at rest (its tour). Everything else is still at rest by decision: hovers carry the life of the rest of the page (button labels slide on their runner, rows slide out, the report sheet slides off its stack, a coin drops into the closing's empty recess).

## 404

A strip of tray cut into the board with every recess empty, the middle three labelled 4, 0, 4: "Nothing is filed under this address."
