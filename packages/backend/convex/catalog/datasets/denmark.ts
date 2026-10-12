import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";

/**
 * Denmark's coins since the coin series of 1989, as a Catalog CSV file:
 * country, then denomination, then series (the circulation coins by monarch
 * and design, the five theme series of 2002–2013, the commemorative coins),
 * then one entry per coin type with its years.
 *
 * Facts: Danmarks Nationalbank's pages on the coin series (møntrækken), on
 * the new coins' design, and on its special coin series (særlige
 * møntserier), read 2026-10-13. The bank allows copying its website's
 * material free of charge with Danmarks Nationalbank expressly named as the
 * source, but not changing it, so the dates, sizes, metals, edges and
 * artists it states are kept unchanged in their own fields, and the titles
 * of the theme and commemorative coins are its headings. Notes, and the
 * descriptions in the technical details, are CoinsLite's own summary of the
 * same pages, in English.
 *
 * Where a page gives no figure, the field is empty: the theme coins have no
 * specifications on the bank's page (only the fairy tale coins' metal), the
 * 5, 2 and 1-krone coins with Queen Margrethe II no last year, and the
 * 3000-krone gold coin of 2012 an unreadable weight.
 *
 * Not yet: coins before the series of 1989, the gold and silver collector
 * versions of the theme coins (no specifications given), and banknotes.
 *
 * No images: the bank holds the copyright in the coins' designs, and the
 * monarch's portrait and state symbols need further consent
 * (docs/research/catalog-expansion.md §3.6), so entries show the placeholder.
 */

const pages =
  "https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter";
const coinSeries = `${pages}/danske-moenter-i-dag/moentraekken`;
const newDesign = `${pages}/danske-moenter-i-dag/nye-moenters-design`;
const specialSeries = `${pages}/saerlige-moentserier`;

const nationalbanken = (link: string) => ({
  source: "Danmarks Nationalbank",
  author: "Danmarks Nationalbank",
  licence:
    "Kopieret fra Danmarks Nationalbanks hjemmeside, som tillader kopiering med Danmarks Nationalbank anført som kilde. Kilde: Danmarks Nationalbank.",
  link,
});
const editorial = (link: string) => ({
  source: "CoinsLite editorial, after Danmarks Nationalbank",
  author: "CoinsLite",
  licence: "CoinsLite",
  link,
});
type Provenance = ReturnType<typeof nationalbanken>;
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});
/** The bank's facts and CoinsLite's notes, from one page. */
const creditBoth = (link: string) => ({
  ...credit("facts", nationalbanken(link)),
  ...credit("notes", editorial(link)),
});

type Row = Record<string, string>;

/** The metals and edges the bank names, as Catalog values. */
const aluminiumBronze = {
  material: "aluminiumBronze",
  composition: "copper 92%; aluminium 6%; nickel 2%",
} as const;
const silver999 = {
  material: "silver",
  metal: "silver",
  fineness: "0.999",
  composition: "silver 99.9%",
} as const;
const silver800 = {
  material: "silver",
  metal: "silver",
  fineness: "0.8",
  composition: "silver 80%; copper 20%",
} as const;
const gold900 = {
  material: "gold",
  metal: "gold",
  fineness: "0.9",
  composition: "gold 90%; silver 5%; copper 5%",
} as const;

type Spec = {
  material?: string;
  composition?: string;
  metal?: string;
  fineness?: string;
  strike?: "circulation";
  weight?: string;
  diameter?: string;
  edge?: "plain" | "reeded" | "interruptedReeding";
};

/** The specifications on the coin series page: Materiale, Diameter, Vægt, Rand. */
const twentyKroner: Spec = {
  material: "aluminiumBronze",
  strike: "circulation",
  weight: "9.3",
  diameter: "27",
  edge: "interruptedReeding",
};
const tenKroner: Spec = {
  material: "aluminiumBronze",
  strike: "circulation",
  weight: "7",
  diameter: "23.35",
  edge: "plain",
};
const fiveKroner: Spec = {
  material: "cupronickel",
  strike: "circulation",
  weight: "9.2",
  diameter: "28.5",
  edge: "reeded",
};
const twoKroner: Spec = {
  material: "cupronickel",
  strike: "circulation",
  weight: "5.9",
  diameter: "24.5",
  edge: "interruptedReeding",
};
const oneKrone: Spec = {
  material: "cupronickel",
  strike: "circulation",
  weight: "3.6",
  diameter: "20.25",
  edge: "reeded",
};
const fiftyOre: Spec = {
  // Tinbronze.
  material: "bronze",
  strike: "circulation",
  weight: "4.3",
  diameter: "21.5",
  edge: "plain",
};

/** The special series page's specification blocks for the commemoratives. */
const commemorative20: Spec = {
  ...aluminiumBronze,
  strike: "circulation",
  weight: "9.3",
  diameter: "27",
  edge: "interruptedReeding",
};
const commemorativeSilver: Spec = {
  ...silver999,
  weight: "31.1",
  diameter: "38",
  edge: "plain",
};

type Coin = {
  /** Unique within its series. */
  key: string;
  /** What the coin shows, after its denomination and years. */
  title?: string;
  yearFrom: number;
  yearTo?: number;
  /** YYYY, YYYY-MM or YYYY-MM-DD: the day the bank gives it went into circulation or was issued. */
  issueDate?: string;
  designers?: string[];
  spec: Spec;
  /** CoinsLite's own description of the coin. */
  details: string;
  link: string;
};

type Series = {
  key: string;
  title: string;
  /** CoinsLite's own note on the series. */
  note: string;
  link: string;
  coins: Coin[];
};

type Denomination = { value: number; unit: "øre" | "krone"; series: Series[] };

const denominationOf = ({
  value,
  unit,
}: Pick<Denomination, "value" | "unit">) =>
  unit === "øre" ? `${value} øre` : value === 1 ? "1 krone" : `${value} kroner`;

/** Lowercase words joined by hyphens, cut to 32 characters at a word. */
const slug = (text: string) => {
  const words = text
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return words.length <= 32 ? words : words.slice(0, 33).replace(/-[^-]*$/, "");
};

// Circulation coins.

const frederikX = (coins: Coin[]): Series => ({
  key: "frederik-x",
  title: "Frederik X",
  note: "On King Frederik X's accession the five coins of the series that referred to Queen Margrethe II were given new designs, published on 2 December 2025 and sent gradually into circulation, in versions dated 2025 and 2026; the year marks when a coin was made. They keep the values, sizes, shapes and metals of the coins they replace, and so continue the coin series set by the coin reform of 1988. Jeanette Skov Jensen, the Nationalbank's head of design, designed the series.",
  link: newDesign,
  coins,
});
const margretheII = (coins: Coin[]): Series => ({
  key: "margrethe-ii",
  title: "Margrethe II",
  note: "The coin reform of 1988 set the coin series whose coins first came into circulation in 1989–1993: 20 and 10 kroner in aluminium bronze, 5, 2 and 1 krone in cupronickel, and 50 and 25 øre in tin bronze. The 10 and 5-øre coins were withdrawn and the 2-krone and 50-øre coins added; the 25-øre coin was withdrawn in 2008. The coins with Queen Margrethe II were updated several times before the coins with King Frederik X replaced them.",
  link: coinSeries,
  coins,
});

const portrait = (
  value: 20 | 10,
  artist: string,
  yearFrom: number,
  yearTo: number,
  issueDate: string,
): Coin => ({
  key: `${yearFrom}-${slug(artist)}`,
  title: `portrait by ${artist}`,
  yearFrom,
  yearTo,
  issueDate,
  designers: [artist],
  spec: value === 20 ? twentyKroner : tenKroner,
  details: `Obverse: portrait of Queen Margrethe II by ${artist}, put into circulation ${yearFrom}–${yearTo}. Reverse: three lions and nine hearts in a circular frame under a crown, with ornaments either side of the crown; changed in January 2011, and since 2013 an updated version of the original reverse of 1989.`,
  link: coinSeries,
});
const portraits = (value: 20 | 10, first: string) => [
  portrait(value, "Hanne Varming", Number(first.slice(0, 4)), 1993, first),
  portrait(value, "Jan Petersen", 1994, 1999, "1994"),
  portrait(value, "Mogens Møller", 2001, 2010, "2001"),
  portrait(value, "Lis Nogel", 2011, 2022, "2011"),
  portrait(value, "Eva Hjorth", 2023, 2024, "2023"),
];

const frederikPortrait = (value: 20 | 10): Coin => ({
  key: "2025",
  yearFrom: 2025,
  issueDate: "2025-12",
  designers: ["Eva Hjorth", "Ronny Skov Andersen", "Jeanette Skov Jensen"],
  spec: value === 20 ? twentyKroner : tenKroner,
  details:
    "Obverse: portrait of King Frederik X by Eva Hjorth, first used on the coin for the change of throne of 2024, with the inscriptions “Frederik X” and “Danmarks konge” divided by a heart, the traditional Danish mint mark. Reverse: the royal coat of arms, redrawn in 2024 by Ronny Skov Andersen, under Christian V's crown.",
  link: coinSeries,
});
const frederikMonogram = (spec: Spec): Coin => ({
  key: "2025",
  yearFrom: 2025,
  issueDate: "2025-12",
  designers: ["Ronny Skov Andersen", "Jeanette Skov Jensen"],
  spec,
  details:
    "Obverse: King Frederik X's monogram, drawn by Ronny Skov Andersen and adapted by Jeanette Skov Jensen around the hole, with the year the coin was made. Reverse: the value, the word “Danmark” and a new icon of four joined octagons for Amalienborg's four palaces, designed by Jeanette Skov Jensen.",
  link: coinSeries,
});
const margretheMonogram = (
  yearFrom: number,
  issueDate: string,
  spec: Spec,
): Coin => ({
  key: String(yearFrom),
  yearFrom,
  issueDate,
  spec,
  details:
    "Obverse: Queen Margrethe II's monogram joined by three crowns, adapted to the hole in the middle. Reverse: ornaments inspired by finds from prehistory, and the mint mark, a heart for the Royal Mint in Copenhagen.",
  link: coinSeries,
});

// Theme coins: the special series page's boxes, one per coin.

type ThemeCoin = {
  motif: string;
  issueDate: string;
  /** The artists the bank names for the coin: its reverse first, then the obverse portrait where it says. */
  designers: string[];
  details: string;
};
const themeCoin = (spec: Spec, coin: ThemeCoin): Coin => ({
  key: `${coin.issueDate.slice(0, 4)}-${slug(coin.motif)}`,
  title: coin.motif,
  yearFrom: Number(coin.issueDate.slice(0, 4)),
  yearTo: Number(coin.issueDate.slice(0, 4)),
  issueDate: coin.issueDate,
  designers: coin.designers,
  spec,
  details: coin.details,
  link: specialSeries,
});
const themeSpec: Spec = { strike: "circulation" };
/** The bank gives the fairy tale coins' metal: "den almindelige 10-krone-mønt i aluminiumsbronze". */
const fairyTaleSpec: Spec = {
  strike: "circulation",
  material: "aluminiumBronze",
};
const queenByMøller =
  "Obverse: Queen Margrethe II's portrait by Mogens Møller, as on the ordinary 10 and 20-krone coins.";

const towers: Series = {
  key: "towers",
  title: "Tower coins",
  note: "Ten 20-krone theme coins with Danish towers, issued from December 2002 to June 2007; towers were chosen as national and historical symbols. Every tower coin has Queen Margrethe II's portrait by Mogens Møller on the obverse, the portrait of the ordinary 10 and 20-krone coins. Like every theme coin, they were issued as circulation coins alongside the ordinary coins and remain legal tender.",
  link: specialSeries,
  coins: (
    [
      {
        motif: "Århus Rådhustårn",
        issueDate: "2002-12-02",
        designers: ["Lis Nogel", "Mogens Møller"],
        details:
          "Reverse: the tower of Aarhus City Hall, by Lis Nogel. The first theme coin, issued in the centenary of the birth of Arne Jacobsen, the architect who also designed the Nationalbank.",
      },
      {
        motif: "Børsens Dragetårn",
        issueDate: "2003-05-01",
        designers: ["Karin Lorentzen", "Mogens Møller"],
        details:
          "Reverse: the dragon spire of Børsen, the old stock exchange in Copenhagen, by Karin Lorentzen.",
      },
      {
        motif: "Christiansborg Slotstårn",
        issueDate: "2003-11-20",
        designers: ["Hans Pauli Olsen", "Mogens Møller"],
        details:
          "Reverse: the tower of Christiansborg Palace, by the Faroese sculptor Hans Pauli Olsen.",
      },
      {
        motif: "Gåsetårnet",
        issueDate: "2004-03-31",
        designers: ["Tina Maria Nielsen", "Mogens Møller"],
        details:
          "Reverse: the Goose Tower in Vordingborg, by Tina Maria Nielsen.",
      },
      {
        motif: "Svaneke Vandtårn",
        issueDate: "2004-08-02",
        designers: ["Morten Stræde", "Mogens Møller"],
        details: "Reverse: the water tower in Svaneke, by Morten Stræde.",
      },
      {
        motif: "Landet Kirke",
        issueDate: "2005-01-28",
        designers: ["Øivind Nygård", "Mogens Møller"],
        details: "Reverse: Landet Church, by Øivind Nygård.",
      },
      {
        motif: "Nólsoy Fyr",
        issueDate: "2005-09-15",
        designers: ["Hans Pauli Olsen", "Mogens Møller"],
        details:
          "Reverse: the Nólsoy lighthouse in the Faroe Islands, by Hans Pauli Olsen.",
      },
      {
        motif: "Gråsten Slot",
        issueDate: "2006-02-15",
        designers: ["Sys Hindsbo", "Mogens Møller"],
        details: "Reverse: the bell tower of Gråsten Palace, by Sys Hindsbo.",
      },
      {
        motif: "Tre Brødre",
        issueDate: "2006-09-27",
        designers: ["Niels Motzfeldt", "Mogens Møller"],
        details:
          "Reverse: the Greenlandic cairns Tre Brødre (Three Brothers), by the Greenlandic sculptor Niels Motzfeldt.",
      },
      {
        motif: "Københavns Rådhus",
        issueDate: "2007-06-20",
        designers: ["Lis Nogel", "Mogens Møller"],
        details:
          "Reverse: Copenhagen City Hall, by Lis Nogel, who also made the first tower coin.",
      },
    ] satisfies ThemeCoin[]
  ).map((coin) =>
    themeCoin(themeSpec, {
      ...coin,
      details: `${queenByMøller} ${coin.details}`,
    }),
  ),
};

const fairyTales: Series = {
  key: "fairy-tales",
  title: "Fairy tale coins",
  note: "Five 10-krone theme coins with motifs from Hans Christian Andersen's fairy tales, issued from 2005 to 2007. Besides the ordinary 10-krone coin in aluminium bronze, each was also issued in gold and in silver for collectors. Every fairy tale coin has Queen Margrethe II's portrait in profile by Mogens Møller on the obverse.",
  link: specialSeries,
  coins: (
    [
      {
        motif: "Den Grimme Ælling",
        issueDate: "2005-03-31",
        designers: ["Hans Pauli Olsen", "Mogens Møller"],
        details:
          "Reverse: from “The Ugly Duckling”, a grown swan mirrored in the garden lake of Bregentved estate, by Hans Pauli Olsen.",
      },
      {
        motif: "Den Lille Havfrue",
        issueDate: "2005-10-20",
        designers: ["Tina Maria Nielsen", "Mogens Møller"],
        details:
          "Reverse: inspired by “The Little Mermaid”, by Tina Maria Nielsen.",
      },
      {
        motif: "Skyggen",
        issueDate: "2006-04-24",
        designers: ["Bjørn Nørgaard", "Mogens Møller"],
        details: "Reverse: inspired by “The Shadow”, by Bjørn Nørgaard.",
      },
      {
        motif: "Snedronningen",
        issueDate: "2006-08-30",
        designers: ["Øivind Nygård", "Mogens Møller"],
        details:
          "Reverse: inspired by “The Snow Queen”, by Øivind Nygård. With this motif the Royal Mint won the award for the best artistic silver coin of 2006, and a prize as the best artistic silver coin at the Berlin coin fair in 2006.",
      },
      {
        motif: "Nattergalen",
        issueDate: "2007-10-25",
        designers: ["Torben Ebbesen", "Mogens Møller"],
        details:
          "Reverse: “The Nightingale”, by Torben Ebbesen, with the two Chinese characters for nightingale, as the tale is set in China. The fifth and last fairy tale coin.",
      },
    ] satisfies ThemeCoin[]
  ).map((coin) =>
    themeCoin(fairyTaleSpec, {
      ...coin,
      details: `Obverse: Queen Margrethe II's portrait in profile by Mogens Møller. ${coin.details}`,
    }),
  ),
};

const polar: Series = {
  key: "polar",
  title: "Polar coins",
  note: "Three 10-krone theme coins with motifs from the polar regions, for the International Polar Year 2007–2009 of research in the Arctic and Antarctic. Each was issued as an ordinary 10-krone coin, a 100-krone silver coin and a 1000-krone gold coin; the gold coins were the first struck in Greenlandic gold, from the Nalunaq mine near Nanortalik, marked by a small polar bear in their inscription. Every polar coin has Queen Margrethe II's portrait by Mogens Møller on the obverse, the portrait of the ordinary 10 and 20-krone coins.",
  link: specialSeries,
  coins: (
    [
      {
        motif: "Isbjørn",
        issueDate: "2007-03-26",
        designers: ["Niels Motzfeldt", "Mogens Møller"],
        details:
          "Reverse: a Greenlandic polar bear on an ice floe, by Niels Motzfeldt.",
      },
      {
        motif: "Sirius",
        issueDate: "2008-02-26",
        designers: ["Margrete Sørensen", "Mogens Møller"],
        details: "Reverse: the Sirius sledge patrol, by Margrete Sørensen.",
      },
      {
        motif: "Nordlys",
        issueDate: "2009-02-23",
        designers: ["Morten Stræde", "Mogens Møller"],
        details:
          "Reverse: the northern lights, by Morten Stræde. The third and last polar coin.",
      },
    ] satisfies ThemeCoin[]
  ).map((coin) =>
    themeCoin(themeSpec, {
      ...coin,
      details: `${queenByMøller} ${coin.details}`,
    }),
  ),
};

const shipProof =
  "Also struck in a limited proof edition of particularly fine quality.";
const ships: Series = {
  key: "ships",
  title: "Ship coins",
  note: "Twelve 20-krone theme coins with types of ship chosen to cover as much of Danish maritime history as possible, issued from April 2007 to December 2012. From the kayak and umiak coin of 2010 the obverse has Queen Margrethe II's portrait by Lis Nogel, made for her 70th birthday.",
  link: specialSeries,
  coins: (
    [
      {
        motif: "Vædderen",
        issueDate: "2007-04-25",
        designers: ["Øivind Nygård"],
        details:
          "Reverse: the inspection ship Vædderen, which from August 2006 sailed round the world on the third Galathea expedition, by Øivind Nygård.",
      },
      {
        motif: "Fregatten Jylland",
        issueDate: "2007-09-10",
        designers: ["Hans Pauli Olsen"],
        details:
          "Reverse: the frigate Jylland, the world's longest wooden ship, by Hans Pauli Olsen.",
      },
      {
        motif: "Selandia",
        issueDate: "2008-04-17",
        designers: ["Torben Ebbesen"],
        details: `Reverse: the motor ship Selandia, by Torben Ebbesen. ${shipProof}`,
      },
      {
        motif: "Havhingsten",
        issueDate: "2008-08-08",
        designers: ["Erik Varming"],
        details: `Reverse: the Viking ship Havhingsten fra Glendalough (the Sea Stallion from Glendalough), by Erik Varming. ${shipProof}`,
      },
      {
        motif: "Kongeskibet Dannebrog",
        issueDate: "2008-09-22",
        designers: ["Henrik Wiberg"],
        details:
          "Reverse: the royal yacht Dannebrog, by Henrik Wiberg, medallist at the Royal Mint. Also struck in a limited proof edition, and in a limited edition as a 500-krone coin in fine silver with the Queen's monogram.",
      },
      {
        motif: "Fyrskib XVII",
        issueDate: "2009-05-27",
        designers: ["Karin Lorentzen"],
        details: `Reverse: lightship XVII, by Karin Lorentzen. ${shipProof}`,
      },
      {
        motif: "Færøbåd",
        issueDate: "2009-11-02",
        designers: ["Hans Pauli Olsen"],
        details: `Reverse: a Faroese boat, by the Faroese sculptor Hans Pauli Olsen. ${shipProof}`,
      },
      {
        motif: "Kajak-konebåd",
        issueDate: "2010-11-29",
        designers: ["Niels Motzfeldt", "Lis Nogel"],
        details: `Obverse: Queen Margrethe II's portrait by Lis Nogel, used on the ship coins from this one. Reverse: a Greenlandic kayak and umiak, by Niels Motzfeldt. ${shipProof}`,
      },
      {
        motif: "Emma Mærsk",
        issueDate: "2011-03-18",
        designers: ["Torben Ebbesen", "Lis Nogel"],
        details: `Reverse: the container ship Emma Mærsk, by Torben Ebbesen. ${shipProof}`,
      },
      {
        motif: "Hjejlen",
        issueDate: "2011-06-08",
        designers: ["Henrik Wiberg", "Lis Nogel"],
        details: `Reverse: the paddle steamer Hjejlen, by Henrik Wiberg, issued for its 150th anniversary. ${shipProof} A coin cover with a 20-krone coin and a Post Danmark stamp was issued as well.`,
      },
      {
        motif: "Kong Frederik IX",
        issueDate: "2012-05-29",
        designers: ["Elisabeth Toubro", "Lis Nogel"],
        details: `Reverse: the ferry Kong Frederik IX, by Elisabeth Toubro. ${shipProof}`,
      },
      {
        motif: "Fiskekutter",
        issueDate: "2012-12-11",
        designers: ["Margrete Sørensen", "Lis Nogel"],
        details:
          "Reverse: a typical Danish fishing cutter, by Margrete Sørensen. The twelfth and last ship coin.",
      },
    ] satisfies ThemeCoin[]
  ).map((coin) => themeCoin(themeSpec, coin)),
};

const science: Series = {
  key: "science",
  title: "Science coins",
  note: "Four 20-krone theme coins with scientific theories by Danish scientists, issued together on 7 October 2013, the centenary of Niels Bohr's atomic theory. The obverse has Queen Margrethe II's portrait by Lis Nogel, made for her 70th birthday. The series was also issued as four 500-krone silver coins, and the 20-krone coins in a proof version for collectors.",
  link: specialSeries,
  coins: (
    [
      {
        motif: "Niels Bohr – Atomteori",
        details: "Reverse: Niels Bohr's atomic theory.",
      },
      {
        motif: "H.C. Ørsted – Elektromagnetisme",
        details: "Reverse: H.C. Ørsted's discovery of electromagnetism.",
      },
      {
        motif: "Ole Rømer – Lysets hastighed",
        details: "Reverse: Ole Rømer's discovery of the speed of light.",
      },
      {
        motif: "Tycho Brahe – Stella Nova",
        details: "Reverse: Tycho Brahe's discovery of the star Stella Nova.",
      },
    ] as const
  ).map(({ motif, details }) =>
    themeCoin(themeSpec, {
      motif,
      issueDate: "2013-10-07",
      designers: ["Lis Nogel"],
      details: `Obverse: Queen Margrethe II's portrait by Lis Nogel. ${details}`,
    }),
  ),
};

// Commemorative coins: the special series page's timeline, one item per occasion.

type Occasion = {
  heading: string;
  issueDate: string;
  designers: string[];
  details: string;
  /** Each coin the occasion gave, by its value in kroner, with the bank's specifications. */
  coins: Array<{ value: number; spec: Spec; details?: string }>;
};

const occasions: Occasion[] = [
  {
    heading: "Tronskiftemønt med Kong Frederik 10. og Dronning Margrethe 2.",
    issueDate: "2024-11-01",
    designers: ["Eva Hjorth", "Jeanette Skov Jensen"],
    details:
      "Marks the change of throne from Queen Margrethe II to King Frederik X. One side: King Frederik X in profile facing right. Other side: Queen Margrethe II in profile facing right. Portraits by Eva Hjorth; coin designed by Jeanette Skov Jensen, the Nationalbank's head of design. An uncirculated version was sold through the dealer Nordfrim.",
    coins: [{ value: 20, spec: commemorative20 }],
  },
  {
    heading: "Dronning Margrethe 2.s 50-års regeringsjubilæum",
    issueDate: "2022-01-14",
    designers: ["Kathrine Moseholm", "Jeanette Skov Jensen"],
    details:
      "For the 50th anniversary of Queen Margrethe II's reign. Obverse: a portrait made for the occasion by Kathrine Moseholm, the Queen in profile in a modern, minimalist style inspired by paper cuts. Reverse: an organic pattern formed of the number 50, recalling Amalienborg's four palaces and square, around the Queen's monogram, by Jeanette Skov Jensen.",
    coins: [
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 80-års fødselsdag",
    issueDate: "2020-04-16",
    designers: ["Lis Nogel", "Jeanette Skov Jensen"],
    details:
      "For Queen Margrethe II's 80th birthday. Obverse: the Queen in profile facing right, by Lis Nogel, within the ring “Margrethe II Danmarks Dronning” and the Royal Mint's heart. Reverse: symbols of the Queen's motto, a heart within a circle of 12 pairs of scissors whose legs form Ms for Margrethe, recalling her art; by Jeanette Skov Jensen.",
    coins: [
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2. og Prins Henriks guldbryllup",
    issueDate: "2017-06-10",
    designers: ["Henrik Wiberg"],
    details:
      "For the golden wedding of Queen Margrethe II and Prince Henrik. Obverse: the royal couple in three-quarter profile facing each other, within a ring reading “H.M. Dronningen og H.K.H. Prinsen”. Reverse: the couple's joint monogram, the two years and the date of the golden wedding, and the mint mark heart. Portrait and monogram by Henrik Wiberg.",
    coins: [
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 75-års fødselsdag",
    issueDate: "2015-04-16",
    designers: ["Henrik Wiberg", "Jeanette Skov Jensen"],
    details:
      "For Queen Margrethe II's 75th birthday. Obverse: the Queen in three-quarter profile without diadem or jewellery, a private portrait, modelled by the Nationalbank's medallist Henrik Wiberg. Reverse: motifs from the Danish landscape after the Queen's own art, with her signature, by Jeanette Skov Jensen.",
    coins: [
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 40-års regeringsjubilæum",
    issueDate: "2012-01-14",
    designers: ["Karin Lorentzen", "Ronny Andersen"],
    details:
      "For the 40th anniversary of Queen Margrethe II's reign. Obverse: a bust of the Queen as head of the Order of the Elephant and the Order of the Dannebrog, by Karin Lorentzen. Reverse: a heraldic composition after the Queen's idea, worked up by the heraldic artist Ronny Andersen, with Denmark's three lions and nine hearts, the Faroese ram and the Greenlandic bear within wavy lines for the sea that joins the realm.",
    coins: [
      {
        value: 3000,
        spec: { ...gold900, diameter: "22", edge: "plain" },
        details:
          "The bank's page gives this coin's weight as “8,65,1 g”, so no weight is filled in.",
      },
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 70-års fødselsdag",
    issueDate: "2010-04-16",
    designers: ["Lis Nogel", "Ronny Andersen"],
    details:
      "For Queen Margrethe II's 70th birthday. Obverse: the Queen in profile facing right, by Lis Nogel. Reverse: the royal coat of arms against a background of marguerites, drawn by the royal heraldic painter Ronny Andersen.",
    coins: [
      {
        value: 1000,
        spec: { ...gold900, weight: "8.65", diameter: "22", edge: "plain" },
      },
      { value: 500, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "H.K.H. Kronprins Frederik og frk. Mary Donaldsons bryllup",
    issueDate: "2004-05-14",
    designers: ["Karin Lorentzen"],
    details:
      "For the wedding of Crown Prince Frederik and Mary Donaldson. Obverse: Queen Margrethe II in profile facing right. Reverse: a double portrait of the Crown Prince and Mary Elizabeth Donaldson in profile facing right, within a ring. Portraits by Karin Lorentzen.",
    coins: [
      { value: 200, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 60-års fødselsdag",
    issueDate: "2000-04-16",
    designers: ["Mogens Møller"],
    details:
      "For Queen Margrethe II's 60th birthday. Obverse: the Queen in profile facing right before a stylised marguerite, set in a small hollow so the relief stands particularly high. Reverse: a crown of the design used on the ½, 1 and 2-krone coins of 1924–41, above nine marguerites and the years 1940 and 2000. Both sides by Mogens Møller.",
    coins: [
      { value: 200, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 25-års regeringsjubilæum",
    issueDate: "1997-01-14",
    designers: ["Jan Petersen"],
    details:
      "For the 25th anniversary of Queen Margrethe II's reign. Obverse: the Queen at full length in a long dress with the chain of the Order of the Elephant, inspired by the coins of Christian IV showing the king standing with sceptre and crown. Reverse: the 20-krone coin has the small arms of the realm (the state arms), the 200-krone coin the great arms (the royal arms). Both sides by Jan Petersen, then medallist at the Royal Mint.",
    coins: [
      { value: 200, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Prins Joachim og Alexandra Manleys bryllup",
    issueDate: "1995-11-14",
    designers: ["Jan Petersen"],
    details:
      "For the wedding of Prince Joachim and Alexandra Manley. Obverse: Queen Margrethe II in profile facing right. Reverse: a three-winged palace inspired by Schackenborg between two trees, with leaves and a fountain; on the 200-krone coin the two zeros form a Chinese symbol of happiness. Both sides by Jan Petersen, then medallist at the Royal Mint.",
    coins: [
      { value: 200, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "1000-året for den første officielle danske mønt",
    issueDate: "1995-09-14",
    designers: ["Jan Petersen"],
    details:
      "For the millennium of the striking of Svend Tveskæg's coin, the first official Danish coin; the only commemorative that marks no event in the royal house. Obverse: Queen Margrethe II in profile facing left, with “Dronning Margrethe II” and “Danmark”. Reverse: a medieval crown with a cross, as on Danish coins of the later Middle Ages. Both sides by Jan Petersen, then medallist at the Royal Mint.",
    coins: [
      { value: 200, spec: { ...commemorativeSilver, edge: "reeded" } },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s og Prins Henriks sølvbryllup",
    issueDate: "1992-06-10",
    designers: ["Jan Petersen"],
    details:
      "For the silver wedding of Queen Margrethe II and Prince Henrik. Obverse: the Queen's bust facing left and Prince Henrik's portrait facing right. Reverse: a house with a garland arch and a crown on its roof, a heart with the number 25 over the door, a sun, a crescent moon and two stars, inspired by Danish allotment garden houses. Both sides by Jan Petersen, then medallist at the Royal Mint.",
    coins: [
      { value: 200, spec: commemorativeSilver },
      { value: 20, spec: commemorative20 },
    ],
  },
  {
    heading: "Dronning Margrethe 2.s 50-års fødselsdag",
    issueDate: "1990-04-16",
    designers: ["Jan Petersen"],
    details:
      "For Queen Margrethe II's 50th birthday. Obverse: the Queen's bust in profile facing right. Reverse: a crown above a marguerite. Both sides by Jan Petersen, then medallist at the Royal Mint.",
    coins: [
      { value: 200, spec: { ...commemorativeSilver, ...silver800 } },
      { value: 20, spec: commemorative20 },
    ],
  },
];

const commemorativesOf = (value: number): Series => ({
  key: "comm",
  title: "Commemorative coins",
  note: "The Nationalbank traditionally issues a commemorative coin for special events in the royal house, such as a change of throne, a jubilee of the reign, a wedding, a silver or golden wedding, or a round birthday. Like the ordinary 10 and 20-krone coins they carry the monarch's portrait, but each is designed for its occasion. Every commemorative coin is legal tender and can be exchanged at its face value in one's own bank.",
  link: specialSeries,
  coins: occasions
    .flatMap((occasion) =>
      occasion.coins
        .filter((coin) => coin.value === value)
        .map((coin) => {
          const year = Number(occasion.issueDate.slice(0, 4));
          return {
            key: `${year}-${slug(occasion.heading)}`,
            title: occasion.heading,
            yearFrom: year,
            yearTo: year,
            issueDate: occasion.issueDate,
            designers: occasion.designers,
            spec: coin.spec,
            details: [occasion.details, coin.details].filter(Boolean).join(" "),
            link: specialSeries,
          };
        }),
    )
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate)),
});

const denominations: Denomination[] = [
  {
    value: 50,
    unit: "øre",
    series: [
      {
        key: "crown",
        title: "Christian V's crown",
        note: "The 50-øre coin went into circulation on 3 July 1989, with the 10-krone coin the first of the coin series set by the coin reform of 1988. Its design has no reference to the monarch, so it was not changed when King Frederik X succeeded Queen Margrethe II.",
        link: coinSeries,
        coins: [
          {
            key: "1989",
            yearFrom: 1989,
            issueDate: "1989-07-03",
            spec: fiftyOre,
            details:
              "Obverse: Christian V's crown, the Danish royal crown since 1671 and the chief symbol of the monarchy and the state, with the year of minting at the top. Reverse: the value and the mint mark, a heart.",
            link: coinSeries,
          },
        ],
      },
    ],
  },
  {
    value: 1,
    unit: "krone",
    series: [
      frederikX([frederikMonogram(oneKrone)]),
      margretheII([margretheMonogram(1993, "1993-01-26", oneKrone)]),
    ],
  },
  {
    value: 2,
    unit: "krone",
    series: [
      frederikX([frederikMonogram(twoKroner)]),
      margretheII([margretheMonogram(1993, "1993-01-26", twoKroner)]),
    ],
  },
  {
    value: 5,
    unit: "krone",
    series: [
      frederikX([frederikMonogram(fiveKroner)]),
      margretheII([margretheMonogram(1990, "1990-04-10", fiveKroner)]),
    ],
  },
  {
    value: 10,
    unit: "krone",
    series: [
      frederikX([frederikPortrait(10)]),
      margretheII(portraits(10, "1989-07-03")),
      fairyTales,
      polar,
    ],
  },
  {
    value: 20,
    unit: "krone",
    series: [
      frederikX([frederikPortrait(20)]),
      margretheII(portraits(20, "1990-04-10")),
      towers,
      ships,
      science,
      commemorativesOf(20),
    ],
  },
  ...[200, 500, 1000, 3000].map(
    (value): Denomination => ({
      value,
      unit: "krone",
      series: [commemorativesOf(value)],
    }),
  ),
];

const root = "dk";

const yearsOf = (coins: Coin[]) => {
  const open = coins.some(({ yearTo }) => yearTo === undefined);
  return {
    year_from: String(Math.min(...coins.map(({ yearFrom }) => yearFrom))),
    year_to: open
      ? ""
      : String(Math.max(...coins.map(({ yearTo = 0 }) => yearTo))),
  };
};

const coinYears = ({ yearFrom, yearTo }: Coin) =>
  yearTo === undefined
    ? `${yearFrom}–`
    : yearFrom === yearTo
      ? `${yearFrom}`
      : `${yearFrom}–${yearTo}`;

function denominationRows(
  denomination: Denomination,
  sortOrder: number,
): Row[] {
  const name = denominationOf(denomination);
  const key = `${root}-${slug(name)}`;
  const all = denomination.series.flatMap(({ coins }) => coins);
  const shared = { item_type: "coin", country: "DK", denomination: name };
  const link = denomination.series[0]?.link ?? coinSeries;
  return [
    {
      id: key,
      parent_id: root,
      title: name,
      sort_order: String(sortOrder),
      is_addable: "false",
      ...shared,
      ...yearsOf(all),
      ...creditBoth(link),
    },
    ...denomination.series.flatMap((series, seriesIndex) => {
      const seriesKey = `${key}-${series.key}`;
      return [
        {
          id: seriesKey,
          parent_id: key,
          title: series.title,
          series: series.title,
          sort_order: String(seriesIndex + 1),
          is_addable: "false",
          ...shared,
          ...yearsOf(series.coins),
          historical_notes: series.note,
          ...creditBoth(series.link),
        },
        ...series.coins.map((coin, index) => ({
          id: `${seriesKey}-${coin.key}`,
          parent_id: seriesKey,
          title: coin.title
            ? `${name} ${coinYears(coin)} – ${coin.title}`
            : `${name} ${coinYears(coin)}`,
          series: series.title,
          sort_order: String(index + 1),
          is_addable: "true",
          ...shared,
          year_from: String(coin.yearFrom),
          year_to: coin.yearTo === undefined ? "" : String(coin.yearTo),
          material: coin.spec.material ?? "",
          composition: coin.spec.composition ?? "",
          metal: coin.spec.metal ?? "",
          fineness: coin.spec.fineness ?? "",
          strike: coin.spec.strike ?? "",
          weight_g: coin.spec.weight ?? "",
          diameter_mm: coin.spec.diameter ?? "",
          edge: coin.spec.edge ?? "",
          designers: (coin.designers ?? []).join("; "),
          issue_date: coin.issueDate ?? "",
          technical_details: coin.details,
          ...creditBoth(coin.link),
        })),
      ];
    }),
  ];
}

const rows: Row[] = [
  {
    id: root,
    title: "Denmark",
    country: "DK",
    // After the United States, the euro, Norway, Romania and the United Kingdom.
    sort_order: "5",
    historical_notes:
      "Danmarks Nationalbank issues Denmark's coins. Since the coin reform of 1988 the coin series has had coins of 20, 10, 5, 2 and 1 kroner and 50 øre, with the monarch's portrait on the 20 and 10-krone coins and the monogram on the 5, 2 and 1-krone coins. Every Danish coin issued since 1875 in one of these values is still legal tender, the theme and commemorative coins included.",
    ...creditBoth(coinSeries),
  },
  ...denominations.flatMap((denomination, index) =>
    denominationRows(denomination, index + 1),
  ),
];

export const denmark = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
