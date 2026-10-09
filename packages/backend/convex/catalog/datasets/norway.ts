import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";

/**
 * Norway in the krone era, as a Catalog CSV file: every banknote from series I
 * (1877) to series VIII, the small-denomination notes of both world wars, the
 * circulation coins from 1958, one entry per coin type with its years of
 * minting, and the commemorative coins from 1906 to 2024. Country, then
 * denomination, then series, then entries.
 *
 * Facts: Norges Bank's pages on its current, withdrawn and commemorative notes
 * and coins, and its overview of the commemorative coins from 1906 to 2004.
 * Norges Bank lets anyone copy its website's material with Norges Bank quoted
 * as the source, and the dates, sizes, alloys and mintages are facts. Notes
 * are CoinsLite's own summary of the same pages.
 *
 * Not yet: circulation coins from 1875 to 1957, and an entry per year struck,
 * which need a source listing every year (docs/research/catalog-data-sources.md).
 *
 * No images: Norwegian designs are protected, and their rights holders
 * (Norges Bank and BONO) haven't consented, so entries show the placeholder.
 */

const pages = "https://www.norges-bank.no";
const withdrawn = `${pages}/en/topics/notes-and-coins/withdrawn-notes-coins`;
const legalTender = `${pages}/en/topics/notes-and-coins/legal-tender-notes-coins`;
const commemoratives = `${pages}/tema/Sedler-og-mynter/Minnemynter`;
const overview1906to2004 = `${pages}/globalassets/upload/sedler-og-mynter/minnemynter_norges_bank.pdf`;

const norgesBank = (link: string) => ({
  source: "Norges Bank",
  author: "Norges Bank",
  licence:
    "Copied from Norges Bank's website, which allows copies with Norges Bank quoted as the source. Kilde: Norges Bank.",
  link,
});
const editorial = (link: string) => ({
  source: "CoinsLite editorial, after Norges Bank",
  author: "CoinsLite",
  licence: "CoinsLite",
  link,
});

type Provenance = ReturnType<typeof norgesBank>;
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

type Row = Record<string, string>;

/** The alloys Norges Bank names, as Catalog materials and in words. */
const alloys = {
  cupronickel: {
    material: "cupronickel",
    words: "Alloy: 75% copper, 25% nickel.",
  },
  bronze: {
    material: "bronze",
    words: "Alloy: 97% copper, 2.5% zinc, 0.5% tin.",
  },
  nickelSilver: {
    material: "nickelBrass",
    words: "Alloy: 81% copper, 10% zinc, 9% nickel (nickel silver).",
  },
} as const;
type Alloy = keyof typeof alloys;

/** A coin of precious metal: its metal and fineness, as Norges Bank gives them. */
type Precious = { metal: "silver" | "gold"; fineness?: string };

type Coin = {
  /** Unique within the denomination: a coin type's years, or a commemorative's year and occasion. */
  key: string;
  title: string;
  yearFrom: number;
  yearTo?: number;
  strike?: "circulation" | "proof";
  alloy?: Alloy;
  precious?: Precious;
  weight?: string;
  diameter?: string;
  details: string[];
  note?: string;
  link: string;
};

type Denomination = {
  /** The value in øre or kroner, as written on the coin or note. */
  value: number;
  unit: "øre" | "krone";
};

const denominationOf = ({ value, unit }: Denomination) =>
  unit === "øre"
    ? `${value} øre`
    : `${value} ${value === 1 ? "krone" : "kroner"}`;
const denominationKey = ({ value, unit }: Denomination) =>
  `${value}-${unit === "øre" ? "ore" : value === 1 ? "krone" : "kroner"}`;

/** Circulation coins from 1958, by denomination and reign: Norges Bank's pages on its withdrawn and current coins. */
const coins1958to1991 = `${withdrawn}/Coins-1957-1991/`;
const coins1992to1996 = `${withdrawn}/Coins-1992-1996/`;
const currentCoin = (value: number) =>
  `${pages}/tema/Sedler-og-mynter/gyldige-sedler-mynter/${value}-kronemynten/${value}-utforming/`;

const circulationCoin = (
  key: string,
  yearFrom: number,
  yearTo: number | undefined,
  alloy: Alloy,
  weight: string,
  diameter: string,
  details: string[],
  link: string,
): Coin => ({
  key,
  title: "",
  yearFrom,
  yearTo,
  strike: "circulation",
  alloy,
  weight,
  diameter,
  details,
  link,
});

type CoinSeries = { key: string; title: string; note?: string; coins: Coin[] };
type CoinDenomination = Denomination & { series: CoinSeries[] };

const olavV = (coins: Coin[]): CoinSeries => ({
  key: "olav-v",
  title: "Olav V",
  note: "King Olav V reigned from 1957 to 1991. His coins were issued from 1958, and the øre coins of the 1970s carried his monogram, the coat of arms or a lion rather than his portrait.",
  coins,
});
const haraldV = (coins: Coin[]): CoinSeries => ({
  key: "harald-v",
  title: "Harald V",
  note: "King Harald V has reigned since 1991. His first coins kept the earlier designs with a new portrait; the 10 and 20-krone coins of 1994–95 and the 1 and 5-krone coins of 1997–98 brought new designs and smaller sizes. From 2017 to 2025 Norges Bank had no ordinary coins struck, only special editions.",
  coins,
});

/** Commemorative coins, by denomination: Norges Bank's overview of 1906–2004 and its page for each coin since. */
const commemorative = (
  year: number,
  occasion: string,
  coin: Omit<Coin, "key" | "title" | "yearFrom">,
  key = occasion,
): Coin => ({
  key: `${year}-${slug(key)}`,
  title: occasion,
  yearFrom: year,
  yearTo: year,
  ...coin,
});

/** Lowercase words joined by hyphens, cut to 40 characters at a word. */
const slug = (text: string) => {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return words.length <= 40 ? words : words.slice(0, 41).replace(/-[^-]*$/, "");
};

const commemorativeSeries = (coins: Coin[]): CoinSeries => ({
  key: "comm",
  title: "Commemorative coins",
  coins,
});

const silver2krone = {
  precious: { metal: "silver", fineness: "0.8" },
  weight: "15",
  diameter: "31",
  link: overview1906to2004,
} as const;
const fiveKrone = {
  strike: "circulation",
  alloy: "cupronickel",
  weight: "11.5",
  diameter: "29.5",
  link: overview1906to2004,
} as const;
const tenKrone = {
  strike: "circulation",
  alloy: "nickelSilver",
  weight: "6.8",
  diameter: "24",
} as const;
const twentyKrone = {
  strike: "circulation",
  alloy: "nickelSilver",
  weight: "9.9",
  diameter: "27.5",
} as const;
const silver100krone = {
  precious: { metal: "silver", fineness: "0.925" },
  weight: "33.8",
  diameter: "39",
} as const;
const silver200krone = {
  strike: "proof",
  precious: { metal: "silver", fineness: "0.925" },
  weight: "16.85",
  diameter: "32",
} as const;
const gold1500krone = {
  precious: { metal: "gold", fineness: "0.917" },
  diameter: "27",
} as const;

const lillehammer = (
  number: number,
  motif: string,
  coin: Omit<Coin, "key" | "title" | "yearFrom" | "details" | "link">,
  details: string[],
): Coin => ({
  key: `${number}`,
  title: `Lillehammer 1994 nr. ${number}: ${motif}`,
  yearFrom: 1991,
  yearTo: 1993,
  details,
  link: overview1906to2004,
  ...coin,
});

const lillehammerSeries = (coins: Coin[]): CoinSeries => ({
  key: "lillehammer-1994",
  title: "Lillehammer 1994 Winter Olympics",
  note: "For the XVII Olympic Winter Games at Lillehammer in 1994, Norges Bank issued four gold and twelve silver coins in four releases from May 1992 to October 1993, at most 1 994 000 coins in all. The first release was struck in 1991 with King Olav V's portrait, the rest in 1992 and 1993 with King Harald V's. The gold coins show Norwegian ski traditions, the 100-krone coins Olympic sports and the 50-krone coins winter pastimes.",
  coins,
});

const coinDenominations: CoinDenomination[] = [
  {
    value: 1,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1972",
          1958,
          1972,
          "bronze",
          "2",
          "16",
          [
            "Obverse: royal monogram (OV) surmounted by the royal crown.",
            "Reverse: squirrel facing left.",
            "Designers: Øivind Hansen and Per Palle Storm.",
            "No longer legal tender from 1 January 1975.",
          ],
          coins1958to1991,
        ),
      ]),
    ],
  },
  {
    value: 2,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1972",
          1958,
          1972,
          "bronze",
          "4",
          "21",
          [
            "Obverse: royal monogram (OV) surmounted by the royal crown.",
            "Reverse: male black grouse facing right.",
            "Designers: Øivind Hansen and Per Palle Storm.",
            "No longer legal tender from 1 January 1975.",
          ],
          coins1958to1991,
        ),
      ]),
    ],
  },
  {
    value: 5,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1973",
          1958,
          1973,
          "bronze",
          "8",
          "27",
          [
            "Obverse: portrait facing left.",
            "Reverse: moose facing left.",
            "Designer: Per Palle Storm.",
            "No longer legal tender from 1 January 1975.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1973-1982",
          1973,
          1982,
          "bronze",
          "3",
          "19",
          [
            "Obverse: heraldic lion.",
            "Reverse: denomination.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 1 January 1985.",
          ],
          coins1958to1991,
        ),
      ]),
    ],
  },
  {
    value: 10,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1973",
          1958,
          1973,
          "cupronickel",
          "1.5",
          "15",
          [
            "Obverse: royal monogram (OV) surmounted by the royal crown.",
            "Reverse: bee facing left.",
            "Designers: Øivind Hansen and Per Palle Storm.",
            "No longer legal tender from 23 January 1993.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1974-1991",
          1974,
          1991,
          "cupronickel",
          "1.5",
          "15",
          [
            "Obverse: royal monogram (OV) surmounted by the royal crown.",
            "Reverse: denomination.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 23 January 1993.",
          ],
          coins1958to1991,
        ),
      ]),
    ],
  },
  {
    value: 25,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1973",
          1958,
          1973,
          "cupronickel",
          "2.4",
          "17",
          [
            "Obverse: portrait facing left.",
            "Reverse: bird facing left.",
            "Designer: Per Palle Storm.",
            "No longer legal tender from 1 January 1985.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1974-1982",
          1974,
          1982,
          "cupronickel",
          "1.5",
          "15",
          [
            "Obverse: cross of four royal monograms (OV), each surmounted by the royal crown.",
            "Reverse: denomination.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 1 January 1985.",
          ],
          coins1958to1991,
        ),
      ]),
    ],
  },
  {
    value: 50,
    unit: "øre",
    series: [
      olavV([
        circulationCoin(
          "1958-1973",
          1958,
          1973,
          "cupronickel",
          "4.8",
          "22",
          [
            "Obverse: portrait facing left.",
            "Reverse: Norwegian elkhound facing right.",
            "Designer: Per Palle Storm.",
            "No longer legal tender from 16 September 1997.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1974-1991",
          1974,
          1991,
          "cupronickel",
          "4.8",
          "22",
          [
            "Obverse: coat of arms of Norway surmounted by the royal crown.",
            "Reverse: denomination.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 16 September 1997.",
          ],
          coins1958to1991,
        ),
      ]),
      haraldV([
        circulationCoin(
          "1992-1996",
          1992,
          1996,
          "cupronickel",
          "4.8",
          "22",
          [
            "Obverse: coat of arms of Norway surmounted by the royal crown.",
            "Reverse: denomination.",
            "Designer: Øivind Hansen.",
          ],
          coins1992to1996,
        ),
        {
          key: "1996-2011",
          title: "",
          yearFrom: 1996,
          yearTo: 2011,
          strike: "circulation",
          details: [
            "Legal tender from 16 September 1996 to 1 May 2012; Norges Bank still exchanges it.",
          ],
          link: `${withdrawn}/50-ore-coin-1996-2011/`,
        },
      ]),
    ],
  },
  {
    value: 1,
    unit: "krone",
    series: [
      olavV([
        circulationCoin(
          "1958-1973",
          1958,
          1973,
          "cupronickel",
          "7",
          "25",
          [
            "Obverse: portrait facing left.",
            "Reverse: horse rearing, facing left.",
            "Designer: Per Palle Storm.",
            "No longer legal tender from 5 September 1998.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1974-1991",
          1974,
          1991,
          "cupronickel",
          "7",
          "25",
          [
            "Obverse: portrait facing left and the King's motto, ALT FOR NORGE.",
            "Reverse: royal crown.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 5 September 1998.",
          ],
          coins1958to1991,
        ),
      ]),
      haraldV([
        circulationCoin(
          "1992-1996",
          1992,
          1996,
          "cupronickel",
          "7",
          "25",
          [
            "Obverse: portrait facing right and the King's motto, ALT FOR NORGE.",
            "Reverse: royal crown.",
            "Designers: Ingrid Austlid Rise and Øivind Hansen.",
          ],
          coins1992to1996,
        ),
        circulationCoin(
          "1997",
          1997,
          undefined,
          "cupronickel",
          "4.35",
          "21",
          [
            "Centre hole 3.2 mm. Thickness 1.7 mm. Plain edge.",
            "Obverse: a cross of King Harald V's crowned monogram.",
            "Reverse: a bird in foliage after the carvings of the Hylestad stave church portal.",
            "Designer: Ingrid Austlid Rise.",
            "Legal tender from 15 September 1997.",
          ],
          currentCoin(1),
        ),
      ]),
    ],
  },
  {
    value: 2,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1906, "Unionsoppløsningen, stort skjold", {
          ...silver2krone,
          details: [
            "Alloy: 800/1000 silver, 200/1000 copper.",
            "Reverse after Gerhard Munthe; engraved by Ivar Throndsen.",
            "Mintage: 100 000.",
          ],
          note: "Marks the dissolution of the union with Sweden in 1905.",
        }),
        commemorative(1907, "Unionsoppløsningen, lite skjold", {
          ...silver2krone,
          details: [
            "Alloy: 800/1000 silver, 200/1000 copper.",
            "A smaller coat of arms on the obverse and a beaded border on the reverse.",
            "Mintage: 54 600.",
          ],
          note: "Struck in 1907 when the 1906 mintage proved too small.",
        }),
        commemorative(1907, "Geværtokronen", {
          ...silver2krone,
          details: [
            "Alloy: 800/1000 silver, 200/1000 copper.",
            "Two crossed rifles and a cavalry sabre on the reverse.",
            "Mintage: 27 500.",
          ],
          note: "Awarded to the soldiers mobilised during the dissolution of the union in 1905.",
        }),
        commemorative(1914, "Grunnloven 100 år", {
          ...silver2krone,
          details: [
            "Alloy: 800/1000 silver, 200/1000 copper.",
            "Designer: Gunnar Utsond.",
            "Mintage: 225 600, of which 69 500 with a matt surface.",
          ],
          note: "Marks the centenary of the Constitution of 1814.",
        }),
      ]),
    ],
  },
  {
    value: 5,
    unit: "krone",
    series: [
      olavV([
        circulationCoin(
          "1963-1973",
          1963,
          1973,
          "cupronickel",
          "11.5",
          "29.5",
          [
            "Obverse: portrait facing left and the King's motto, ALT FOR NORGE.",
            "Reverse: coat of arms of Norway surmounted by the royal crown.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 9 July 2000; Norges Bank still exchanges it.",
          ],
          coins1958to1991,
        ),
        circulationCoin(
          "1974-1991",
          1974,
          1991,
          "cupronickel",
          "11.5",
          "29.5",
          [
            "Obverse: portrait facing left.",
            "Reverse: coat of arms of Norway surmounted by the royal crown.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 9 July 2000; Norges Bank still exchanges it.",
          ],
          coins1958to1991,
        ),
      ]),
      haraldV([
        circulationCoin(
          "1992-1994",
          1992,
          1994,
          "cupronickel",
          "11.5",
          "29.5",
          [
            "Obverse: portrait facing right.",
            "Reverse: coat of arms of Norway surmounted by the royal crown.",
            "Designers: Ingrid Austlid Rise and Øivind Hansen.",
            "No longer legal tender from 9 July 2000; Norges Bank still exchanges it.",
          ],
          coins1992to1996,
        ),
        circulationCoin(
          "1998",
          1998,
          undefined,
          "cupronickel",
          "7.85",
          "26",
          [
            "Centre hole 4.4 mm. Thickness 2.0 mm. Reeded edge.",
            "Obverse: the Grand Cross chain of the Order of St. Olav.",
            "Reverse: acanthus ornament in the style of the woodcarver Ole Moene.",
            "Designer: Ingrid Austlid Rise.",
            "Legal tender from 15 September 1998.",
          ],
          currentCoin(5),
        ),
      ]),
      commemorativeSeries([
        commemorative(1975, "Myntreformen 100 år", {
          ...fiveKrone,
          details: ["Plain edge.", "Designer: Øivind Hansen."],
          note: "Marks the centenary of the coinage reform of 1875, which brought in the krone.",
        }),
        commemorative(1975, "Utvandringen 150 år", {
          ...fiveKrone,
          details: ["Plain edge.", "Reverse: the sloop Restauration."],
          note: "Marks 150 years of Norwegian emigration, from 1825.",
        }),
        commemorative(1978, "Hæren 350 år", {
          ...fiveKrone,
          diameter: undefined,
          details: [
            "Plain edge.",
            "Reverse: the crowned monograms of Christian IV and Olav V either side of a sword.",
          ],
          note: "Marks the 350th anniversary of the Norwegian Army.",
        }),
        commemorative(1986, "Den Kongelige Mynt 300 år", {
          ...fiveKrone,
          details: [
            "Plain edge.",
            "Designer: Øivind Hansen.",
            "In circulation from 19 June 1986.",
          ],
          note: "Marks the 300th anniversary of the Royal Mint at Kongsberg.",
        }),
        commemorative(1991, "Norges Bank 175 år", {
          ...fiveKrone,
          details: [
            "Plain edge.",
            "Reverse: a silver tankard from before 1814, for the silver tax that founded Norges Bank.",
          ],
          note: "Marks Norges Bank's 175th anniversary on 14 June 1991.",
        }),
        commemorative(1995, "Norsk mynt i tusen år", {
          ...fiveKrone,
          details: [
            "Plain edge.",
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 29 September 1995.",
          ],
          note: "Marks a thousand years of coinage in Norway, after Olav Tryggvason's penny of 995.",
        }),
        commemorative(1995, "FN 50 år", {
          ...fiveKrone,
          details: ["Reverse: Trygve Lie and five children."],
          note: "Marks the 50th anniversary of the United Nations.",
        }),
        commemorative(1996, "Framferden 100 år", {
          ...fiveKrone,
          details: [
            "Reverse: the polar ship Fram frozen in the ice.",
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 20 May 1996.",
          ],
          note: "Marks a hundred years since Fridtjof Nansen's return from the Fram expedition across the Arctic Ocean.",
        }),
        commemorative(1997, "Posten 350 år", {
          ...fiveKrone,
          details: [
            "Plain edge.",
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 16 April 1997.",
          ],
          note: "Marks the 350th anniversary of the Norwegian postal service.",
        }),
      ]),
    ],
  },
  {
    value: 10,
    unit: "krone",
    series: [
      olavV([
        circulationCoin(
          "1983-1991",
          1983,
          1991,
          "nickelSilver",
          "9",
          "24",
          [
            "Obverse: portrait facing left.",
            "Reverse: denomination in a recessed field surrounded by the Grand Cross chain of the Order of St. Olav.",
            "Designer: Øivind Hansen.",
            "No longer legal tender from 15 September 1996; Norges Bank still exchanges it.",
          ],
          coins1958to1991,
        ),
      ]),
      haraldV([
        circulationCoin(
          "1995",
          1995,
          undefined,
          "nickelSilver",
          "6.8",
          "24",
          [
            "Thickness 2.0 mm. Interrupted reeding on the edge.",
            "Obverse: portrait facing right and the King's motto, ALT FOR NORGE.",
            "Reverse: part of a stave church roof.",
            "Designer: Nils Aas.",
            "Legal tender from 15 September 1995.",
          ],
          currentCoin(10),
        ),
      ]),
      commemorativeSeries([
        commemorative(1964, "Grunnloven 150 år", {
          precious: { metal: "silver", fineness: "0.9" },
          weight: "20",
          diameter: "35",
          details: [
            "Alloy: 900/1000 silver, 100/1000 copper.",
            "Edge: ENIG OG TRO TIL DOVRE FALLER.",
            "Designer: Øivind Hansen.",
            "Issued in May 1964.",
          ],
          note: "Marks the 150th anniversary of the Constitution.",
          link: overview1906to2004,
        }),
        commemorative(2008, "Henrik Wergeland", {
          ...tenKrone,
          details: [
            "Reverse: Enzo Finger.",
            "In circulation from 17 June 2008.",
          ],
          note: "Marks the bicentenary of the poet Henrik Wergeland's birth.",
          link: `${commemoratives}/Wergeland-10-krone/`,
        }),
        commemorative(2010, "Ole Bull", {
          ...tenKrone,
          details: [
            "Reverse: Wenche Gulbransen.",
            "In circulation from 5 February 2010.",
          ],
          note: "Marks the bicentenary of the violinist Ole Bull's birth.",
          link: `${commemoratives}/Ole-Bull-10-krone-minnemynt-2010/`,
        }),
        commemorative(2011, "Universitetet 200 år", {
          ...tenKrone,
          details: ["Reverse: Enzo Finger.", "In circulation from 3 May 2011."],
          note: "Marks the bicentenary of Norway's first university.",
          link: `${commemoratives}/Universitetet-10-krone-minnemynt-2011/`,
        }),
        commemorative(2013, "Allmenn stemmerett", {
          ...tenKrone,
          details: [
            "Reverse: Siri Dokken.",
            "In circulation from 8 March 2013.",
          ],
          note: "Marks the centenary of universal suffrage in 1913.",
          link: `${commemoratives}/Allmenn-stemmerett-10-krone-minnemynt-2013/`,
        }),
      ]),
    ],
  },
  {
    value: 20,
    unit: "krone",
    series: [
      haraldV([
        circulationCoin(
          "1994",
          1994,
          undefined,
          "nickelSilver",
          "9.9",
          "27.5",
          [
            "Thickness 2.2 mm. Plain edge.",
            "Obverse: portrait facing right.",
            "Reverse: the prow of a Viking ship.",
            "Designer: Nils Aas.",
            "Legal tender from 1 November 1994.",
          ],
          currentCoin(20),
        ),
      ]),
      commemorativeSeries([
        commemorative(1999, "Akershus 700 år", {
          ...twentyKrone,
          details: [
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 7 May 1999.",
          ],
          note: "Marks the 700th anniversary of Akershus Fortress.",
          link: overview1906to2004,
        }),
        commemorative(1999, "Vikingene, mot ukjent land", {
          ...twentyKrone,
          details: [
            "Designer: Nils Aas.",
            "In circulation from 9 October 1999.",
          ],
          note: "Marks a thousand years since the first Vikings landed at L'Anse aux Meadows in Newfoundland.",
          link: overview1906to2004,
        }),
        commemorative(2000, "Tusenårsskiftet", {
          ...twentyKrone,
          details: ["Designer: Marit Wiklund."],
          note: "Marks the new millennium.",
          link: overview1906to2004,
        }),
        commemorative(2002, "Niels Henrik Abel", {
          ...twentyKrone,
          details: [
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 5 August 2002.",
          ],
          note: "Marks the bicentenary of the mathematician Niels Henrik Abel's birth.",
          link: `${commemoratives}/Niels-Henrik-Abel-minnemynt/`,
        }),
        commemorative(2004, "Jernbanen 150 år", {
          ...twentyKrone,
          details: [
            "Designer: Ingrid Austlid Rise.",
            "In circulation from 1 June 2004.",
          ],
          note: "Marks 150 years of railways in Norway.",
          link: `${commemoratives}/Jernbanen-20-krone-minnemynt-2004/`,
        }),
        commemorative(2006, "Henrik Ibsen", {
          ...twentyKrone,
          details: [
            "Reverse: Nina Sundbye.",
            "In circulation from 16 January 2006.",
          ],
          note: "Issued for the Ibsen Year 2006.",
          link: `${commemoratives}/Henrik-Ibsen-20-krone-minnemynt/`,
        }),
        commemorative(2014, "Grunnloven 200 år", {
          ...twentyKrone,
          details: [
            "Reverse: Esther Maria Bjørneboe.",
            "In circulation from 16 February 2014.",
          ],
          note: "Marks the bicentenary of the Constitution.",
          link: `${commemoratives}/Grunnloven---20-krone-minnemynt/`,
        }),
        commemorative(2015, "Høyesterett 200 år", {
          ...twentyKrone,
          details: ["In circulation from 7 May 2015."],
          note: "Marks the bicentenary of the Supreme Court of Norway.",
          link: `${commemoratives}/Hoyesterett-20-krone-/`,
        }),
        commemorative(2016, "Norges Bank 200 år", {
          ...twentyKrone,
          details: [
            "Reverse: Kjersti M. Austdal.",
            "In circulation from 14 June 2016.",
          ],
          note: "Marks the bicentenary of Norges Bank.",
          link: `${commemoratives}/Norges-Banks-200-arsjubileum/`,
        }),
        commemorative(2017, "Det første samiske landsmøtet 100 år", {
          ...twentyKrone,
          details: [
            "Reverse: Annelise Josefsen.",
            "In circulation from 7 February 2017.",
          ],
          note: "Marks the centenary of the first Sami national assembly, in Trondheim in 1917.",
          link: `${commemoratives}/Forste-samiske-landsmotet/`,
        }),
        commemorative(2018, "Den Norske Turistforening 150 år", {
          ...twentyKrone,
          details: [
            "Reverse: Martine Linge.",
            "In circulation from 19 January 2018.",
          ],
          note: "Marks the 150th anniversary of the Norwegian Trekking Association.",
          link: `${commemoratives}/dnt-150-ar/`,
        }),
        commemorative(2019, "Gustav Vigeland 150 år", {
          ...twentyKrone,
          details: [
            "Reverse: Håkon Anton Fagerås.",
            "In circulation from 10 April 2019.",
          ],
          note: "Marks the 150th anniversary of the sculptor Gustav Vigeland's birth.",
          link: `${commemoratives}/gustav-vigeland/`,
        }),
        commemorative(2020, "Anne-Cath. Vestly 100 år", {
          ...twentyKrone,
          details: [
            "Reverse: Siri Dokken.",
            "In circulation from 15 June 2020.",
          ],
          note: "Marks the centenary of the author Anne-Cath. Vestly's birth.",
          link: `${commemoratives}/2020-vestly/`,
        }),
        commemorative(2021, "Hans Nielsen Hauge 250 år", {
          ...twentyKrone,
          details: [
            "Reverse: Håkon Anton Fagerås.",
            "In circulation from 3 April 2021.",
          ],
          note: "Marks the 250th anniversary of the lay preacher Hans Nielsen Hauge's birth.",
          link: `${commemoratives}/2021---hans-nielsen-hauge/`,
        }),
        commemorative(2023, "Kartverket 250 år", {
          ...twentyKrone,
          details: [
            "Reverse: Torgeir Husevaag.",
            "In circulation from 8 September 2023.",
          ],
          note: "Marks the 250th anniversary of the Norwegian Mapping Authority.",
          link: `${commemoratives}/2023---kartverket/`,
        }),
        commemorative(2024, "Magnus Lagabøtes landslov 750 år", {
          ...twentyKrone,
          details: [
            "Reverse: Michael Guilfoyle.",
            "In circulation from 1 February 2024.",
          ],
          note: "Marks the 750th anniversary of King Magnus Lagabøte's national law code. Norges Bank decided in March 2026 to issue no more special-edition circulation coins.",
          link: `${commemoratives}/2024-magnus-lagabote/`,
        }),
      ]),
    ],
  },
  {
    value: 25,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1970, "Frigjøringen 25 år", {
          precious: { metal: "silver", fineness: "0.875" },
          weight: "29",
          diameter: "39",
          details: [
            "Alloy: 875/1000 silver, 125/1000 copper.",
            "Obverse: King Haakon VII and King Olav V.",
          ],
          note: "Marks the 25th anniversary of the liberation on 8 May 1945.",
          link: overview1906to2004,
        }),
      ]),
    ],
  },
  {
    value: 50,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1978, "Kong Olav V 75 år", {
          precious: { metal: "silver", fineness: "0.925" },
          weight: "27",
          diameter: "36",
          details: ["Plain edge.", "Designer: Øivind Hansen."],
          note: "Marks King Olav V's 75th birthday on 2 July 1978.",
          link: overview1906to2004,
        }),
        commemorative(1995, "FN 50 år", {
          strike: "proof",
          precious: { metal: "silver", fineness: "0.925" },
          weight: "16.85",
          diameter: "32",
          details: [
            "Plain edge.",
            "Reverse: Trygve Lie and five children.",
            "Designer: Ingrid Austlid Rise.",
          ],
          note: "Marks the 50th anniversary of the United Nations.",
          link: overview1906to2004,
        }),
        commemorative(1995, "Frigjøringen 50 år", {
          strike: "proof",
          precious: { metal: "silver", fineness: "0.925" },
          weight: "16.85",
          diameter: "32",
          details: [
            "Plain edge.",
            "Reverse: a dove of peace and barbed wire.",
            "Designer: Ingrid Austlid Rise.",
          ],
          note: "Marks the 50th anniversary of the liberation on 8 May 1945.",
          link: overview1906to2004,
        }),
      ]),
      lillehammerSeries(
        [
          "Norsk familie på skitur",
          "Barn på ski",
          "Bestefar og barn",
          "Barn på kjelke",
          "Barn på skøyter",
          "Massemønstring",
        ].map((motif, index) =>
          lillehammer(
            index + 1,
            motif,
            {
              precious: { metal: "silver", fineness: "0.925" },
              weight: "16.85",
              diameter: "32",
            },
            [
              "Sterling silver, 15.55 g (1/2 oz) of silver.",
              "Reverse designed by Tor Lindrupsen.",
            ],
          ),
        ),
      ),
    ],
  },
  {
    value: 100,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1982, "Kong Olav V 25 år som konge", {
          precious: { metal: "silver", fineness: "0.925" },
          weight: "24.7",
          diameter: "33",
          details: [
            "Plain edge.",
            "Designer: Øivind Hansen, the reverse after a drawing by Hallvard Trætteberg.",
          ],
          note: "Marks King Olav V's 25 years on the throne, on 21 September 1982.",
          link: overview1906to2004,
        }),
        commemorative(
          1993,
          "Sykkel-VM'93: Velodrom",
          {
            ...silver100krone,
            strike: "proof",
            details: [
              "Edge: VERDENSMESTERSKAPENE I SYKLING HAMAR OG OSLO.",
              "Reverse: Marek Sobocinski.",
            ],
            note: "Issued for the UCI Road and Track World Championships at Hamar and Oslo in August 1993.",
            link: overview1906to2004,
          },
          "Sykkel-VM 93 velodrom",
        ),
        commemorative(
          1993,
          "Sykkel-VM'93: Pelotong",
          {
            ...silver100krone,
            strike: "proof",
            details: [
              "Edge: VERDENSMESTERSKAPENE I SYKLING HAMAR OG OSLO.",
              "Reverse: Marek Sobocinski.",
            ],
            note: "Issued for the UCI Road and Track World Championships at Hamar and Oslo in August 1993.",
            link: overview1906to2004,
          },
          "Sykkel-VM 93 pelotong",
        ),
        commemorative(1999, "Tusenårsskiftet", {
          strike: "proof",
          precious: { metal: "silver", fineness: "0.925" },
          diameter: "39",
          details: [
            "Plain edge.",
            "Reverse: Yggdrasil, the world tree.",
            "Designer: Ingrid Austlid Rise.",
            "Issued on 1 September 1999.",
          ],
          note: "Marks the new millennium.",
          link: overview1906to2004,
        }),
        commemorative(2001, "Nobels fredspris 100 år", {
          ...silver100krone,
          details: [
            "Plain edge.",
            "Reverse: Alfred Nobel, after Gustav Vigeland's Peace Prize medal.",
            "Designer: Øivind Hansen.",
            "Issued on 13 August 2001.",
          ],
          note: "Marks the centenary of the Nobel Peace Prize.",
          link: overview1906to2004,
        }),
        commemorative(2003, "Unionsoppløsningen 100 år", {
          ...silver100krone,
          strike: "proof",
          details: [
            "Obverse: Øivind Hansen. Reverse: Danuta Haremska.",
            "Issued on 27 November 2003.",
            "Mintage: 65 000.",
          ],
          note: "The first of three for the centenary of the union's dissolution in 1905, on the day King Haakon VII took his oath in the Storting.",
          link: overview1906to2004,
        }),
        commemorative(2004, "Unionsoppløsningen 100 år", {
          ...silver100krone,
          strike: "proof",
          details: [
            "Reverse: an oil rig.",
            "Issued on 23 September 2004.",
            "Mintage: 55 000.",
          ],
          note: "The second of three for the centenary of the union's dissolution, on the anniversary of the Karlstad agreement.",
          link: overview1906to2004,
        }),
        commemorative(2005, "Unionsoppløsningen 100 år", {
          precious: { metal: "silver" },
          details: ["Issued on 7 June 2005.", "Mintage: 72 000."],
          note: "The last of three for the centenary of the union's dissolution, on the anniversary of the Storting's resolution of 7 June 1905.",
          link: `${commemoratives}/Minnemynter-i-forbindelse-med-hundrearsmarkeringen/`,
        }),
      ]),
      lillehammerSeries(
        [
          "Langrennsløper",
          "Hurtigløpere på skøyter",
          "Ishockeyspillere",
          "Skihopper",
          "Alpinist",
          "Kunstløperske",
        ].map((motif, index) =>
          lillehammer(index + 1, motif, silver100krone, [
            "Sterling silver, 31.10 g (1 oz) of silver.",
            "Edge: DE XVII OLYMPISKE VINTERLEKER LILLEHAMMER 1994 and the sport's pictogram.",
          ]),
        ),
      ),
    ],
  },
  {
    value: 175,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1989, "Grunnloven 175 år", {
          precious: { metal: "silver", fineness: "0.925" },
          weight: "26.5",
          diameter: "35",
          details: ["Plain edge.", "Reverse: Eidsvoll Manor."],
          note: "Marks the 175th anniversary of the Constitution of 17 May 1814.",
          link: overview1906to2004,
        }),
      ]),
    ],
  },
  {
    value: 200,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1980, "Frigjøringen 35 år", {
          precious: { metal: "silver", fineness: "0.625" },
          weight: "27",
          diameter: "36",
          details: [
            "Plain edge.",
            "Reverse: Akershus Castle from the sea.",
            "Designer: Øivind Hansen.",
          ],
          note: "Marks the 35th anniversary of the liberation on 8 May 1945.",
          link: overview1906to2004,
        }),
        commemorative(2008, "Henrik Wergeland 200 år", {
          ...silver200krone,
          details: ["Plain edge.", "Issued on 8 May 2008.", "Mintage: 29 646."],
          note: "Marks the bicentenary of the poet Henrik Wergeland's birth.",
          link: `${commemoratives}/Wergeland-200-krone/`,
        }),
        commemorative(2009, "Knut Hamsun 150 år", {
          ...silver200krone,
          details: [
            "Plain edge.",
            "Reverse: Enzo Finger.",
            "Issued on 19 February 2009.",
            "Mintage: 16 300.",
          ],
          note: "Marks the 150th anniversary of the author Knut Hamsun's birth.",
          link: `${commemoratives}/Hamsun-200-krone/`,
        }),
        commemorative(2011, "Norges idrettsforbund 150 år", {
          ...silver200krone,
          details: [
            "Plain edge.",
            "Reverse: Ina Viktoria Kristiansen.",
            "Issued on 8 January 2011.",
            "Mintage: 11 948.",
          ],
          note: "Marks the 150th anniversary of the Norwegian Confederation of Sports.",
          link: `${commemoratives}/Norges-idrettsforbund-200-krone/`,
        }),
        commemorative(2011, "Skisporten i Norge", {
          ...silver200krone,
          details: [
            "Plain edge.",
            "Reverse: Ina Viktoria Kristiansen.",
            "Mintage: 15 998.",
          ],
          note: "Issued for the Nordic World Ski Championships at Holmenkollen in 2011.",
          link: `${commemoratives}/Skisporten-i-Norge-200-krone/`,
        }),
        commemorative(2012, "Kongeparet 75 år", {
          ...silver200krone,
          details: [
            "Plain edge.",
            "Obverse: Håkon Anton Fagerås.",
            "Issued on 21 February 2012.",
            "Mintage: 12 550.",
          ],
          note: "Marks the 75th birthdays of King Harald V and Queen Sonja.",
          link: `${commemoratives}/Kongeparet-75-ar/`,
        }),
        commemorative(2014, "Grunnloven 200 år", {
          ...silver200krone,
          details: [
            "Plain edge.",
            "Reverse: Esther Maria Bjørneboe.",
            "Issued on 16 February 2014.",
            "Mintage: 20 300.",
          ],
          note: "Marks the bicentenary of the Constitution.",
          link: `${commemoratives}/Grunnloven---200-kroner-minnemynt/`,
        }),
      ]),
    ],
  },
  {
    value: 1500,
    unit: "krone",
    series: [
      commemorativeSeries([
        commemorative(1993, "Edvard Grieg 150 år", {
          strike: "proof",
          precious: { metal: "gold", fineness: "0.917" },
          weight: "17",
          details: [
            "22 carat gold, 15.55 g (1/2 oz) of gold. Plain edge.",
            "Designer: Grazyna Nasilowska.",
          ],
          note: "Marks the 150th anniversary of the composer Edvard Grieg's birth.",
          link: overview1906to2004,
        }),
        commemorative(
          1993,
          "Sykkel-VM'93",
          {
            ...gold1500krone,
            strike: "proof",
            weight: "17",
            details: [
              "22 carat gold, 15.55 g (1/2 oz) of gold. Plain edge.",
              "Designer: Ingrid Austlid Rise.",
            ],
            note: "Issued for the UCI Road and Track World Championships at Hamar and Oslo in August 1993.",
            link: overview1906to2004,
          },
          "Sykkel-VM 93",
        ),
        commemorative(2000, "Tusenårsskiftet", {
          ...gold1500krone,
          strike: "proof",
          weight: "16.96",
          details: [
            "917/1000 gold, the rest silver: 15.55 g (1/2 oz) of gold. Plain edge.",
            "Designer: Ingrid Austlid Rise.",
            "Issued on 15 January 2000.",
          ],
          note: "Marks the new millennium.",
          link: overview1906to2004,
        }),
        commemorative(2001, "Nobels fredspris 100 år", {
          ...gold1500krone,
          weight: "16.96",
          details: [
            "917/1000 gold, the rest silver: 15.55 g (1/2 oz) of gold. Plain edge.",
            "Designer: Øivind Hansen.",
            "Issued on 13 August 2001.",
          ],
          note: "Marks the centenary of the Nobel Peace Prize.",
          link: overview1906to2004,
        }),
        commemorative(2003, "Unionsoppløsningen 100 år", {
          ...gold1500krone,
          strike: "proof",
          weight: "16.96",
          details: [
            "917/1000 gold, the rest silver. Plain edge.",
            "Obverse: Øivind Hansen. Reverse: Tomasz B. Ozdowski.",
            "Issued on 27 November 2003.",
            "Mintage: 10 000.",
          ],
          note: "The first of three for the centenary of the union's dissolution in 1905, on the day King Haakon VII took his oath in the Storting.",
          link: overview1906to2004,
        }),
        commemorative(2004, "Unionsoppløsningen 100 år", {
          ...gold1500krone,
          strike: "proof",
          weight: "16.96",
          details: [
            "917/1000 gold, the rest silver. Plain edge.",
            "Reverse: drops of oil, by Tomasz B. Ozdowski.",
            "Issued on 23 September 2004.",
            "Mintage: 10 000.",
          ],
          note: "The second of three for the centenary of the union's dissolution, on the anniversary of the Karlstad agreement.",
          link: overview1906to2004,
        }),
        commemorative(2005, "Unionsoppløsningen 100 år", {
          precious: { metal: "gold" },
          details: ["Issued on 7 June 2005.", "Mintage: 9 550."],
          note: "The last of three for the centenary of the union's dissolution, on the anniversary of the Storting's resolution of 7 June 1905.",
          link: `${commemoratives}/Minnemynter-i-forbindelse-med-hundrearsmarkeringen/`,
        }),
      ]),
      lillehammerSeries(
        [
          "Skiløper i helleristning",
          "Birkebeinerne",
          "Telemarkskjører",
          "Norske polferder",
        ].map((motif, index) =>
          lillehammer(index + 1, motif, { ...gold1500krone, weight: "17" }, [
            "22 carat gold, 15.55 g (1/2 oz) of gold. Plain edge.",
          ]),
        ),
      ),
    ],
  },
];

/** Banknotes by denomination and series: Norges Bank's pages on its withdrawn and current notes. */
type Note = {
  series: keyof typeof noteSeries;
  yearFrom: number;
  yearTo?: number;
  details: string[];
};
type NoteDenomination = { value: number; notes: Note[] };

const noteSeries = {
  I: {
    title: "Series I",
    link: `${withdrawn}/Banknote-series-I/`,
    note: "The first notes in kroner, after the Money Act of 1875 replaced the speciedaler with the krone. The only Norwegian series with the monarch, King Oscar II, on the obverse. No longer legal tender from 13 July 1998.",
  },
  II: {
    title: "Series II",
    link: `${withdrawn}/Banknote-series-II/`,
    note: "Designed by the painter Oluf Wold-Torne and in use, with minor changes, from 1901 until all its notes ceased to be legal tender on 9 September 1945.",
  },
  III: {
    title: "Series III",
    link: `${withdrawn}/Banknote-series-III/`,
    note: "The replacement notes, designed in secret during the war and put into circulation on 9 September 1945 as emergency notes. There was no 500-krone note. No longer legal tender from 13 July 1999.",
  },
  IV: {
    title: "Series IV",
    link: `${withdrawn}/Banknote-series-IV/`,
    note: "Portraits of prominent Norwegians on the obverse and the main industries on the reverse, with the architect Arnstein Arneberg as artistic collaborator. No longer legal tender from 13 July 1999.",
  },
  V: {
    title: "Series V",
    link: `${withdrawn}/Banknote-series-V/`,
    note: "Smaller notes from 1962. A coin replaced the 5-krone note in 1963, and the 10-krone note took over its blue colour.",
  },
  VI: {
    title: "Series VI",
    link: `${withdrawn}/Banknote-series-VI/`,
    note: "Norwegian arts and crafts from earlier periods on the reverse. Camilla Collett on the 100-krone note was the first woman on a Norwegian banknote, and the 50-krone note was the first with the bank's name in Nynorsk, NOREGS BANK.",
  },
  VII: {
    title: "Series VII",
    link: `${withdrawn}/banknote-series-VII/`,
    note: "Notes of different lengths and heights, new security features and a new 200-krone note. Portraits of figures from science and culture by Sverre Morken, reverses by Arild Yttri.",
  },
  VIII: {
    title: "Series VIII",
    link: `${legalTender}/`,
    note: "The current notes, on the theme of the sea.",
  },
  small1917: {
    title: "Small-denomination notes 1917–1925",
    link: `${withdrawn}/Small-denomination-notes/`,
    note: "Issued under a law of 1917 because coins had become too scarce to pay wages or give change. No longer legal tender from 1926.",
  },
  small1940: {
    title: "Small-denomination notes 1940–1950",
    link: `${withdrawn}/Small-denomination-notes/`,
    note: "Issued from 1940, when coins quickly ran short again in the Second World War.",
  },
} as const;

const issued = (count: string, size: string, ...motifs: string[]) => [
  `Size: ${size} mm.`,
  ...motifs,
  `Number issued: ${count}.`,
];

const noteDenominations: NoteDenomination[] = [
  {
    value: 1,
    notes: [
      {
        series: "small1917",
        yearFrom: 1917,
        yearTo: 1925,
        details: issued(
          "68 000 000",
          "105 × 68",
          "Obverse: the words EN KRONE.",
          "Reverse: coat of arms of Norway on a St. Olav's rose.",
        ),
      },
      {
        series: "small1940",
        yearFrom: 1940,
        yearTo: 1950,
        details: [
          ...issued(
            "131 500 000",
            "100 × 64",
            "Obverse and reverse: the numerical denomination.",
          ),
          "No longer legal tender from 13 July 1999.",
        ],
      },
    ],
  },
  {
    value: 2,
    notes: [
      {
        series: "small1917",
        yearFrom: 1918,
        yearTo: 1925,
        details: issued(
          "17 400 000",
          "105 × 68",
          "Obverse: the words TO KRONER.",
          "Reverse: coat of arms of Norway on a St. Olav's rose.",
        ),
      },
      {
        series: "small1940",
        yearFrom: 1940,
        yearTo: 1950,
        details: [
          ...issued(
            "68 100 000",
            "100 × 64",
            "Obverse and reverse: the numerical denomination.",
          ),
          "No longer legal tender from 13 July 1999.",
        ],
      },
    ],
  },
  {
    value: 5,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "40 900 000",
          "135 × 78",
          "Obverse: King Oscar II.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "203 200 000",
          "127 × 72",
          "Obverse: W.F.K. Christie, President of the Storting.",
          "Reverse: a St. Olav's rose, a stylised Viking king and the coat of arms.",
        ),
      },
      {
        series: "III",
        yearFrom: 1945,
        yearTo: 1955,
        details: issued(
          "109 000 000",
          "127 × 72",
          "Obverse: a vignette with the coat of arms.",
          "Reverse: the numerical denomination between the words NORGES BANK.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1955,
        yearTo: 1963,
        details: issued(
          "110 770 000",
          "125 × 70",
          "Obverse: Fridtjof Nansen.",
          "Reverse: a fishing station in Lofoten, after a painting by Axel Revold.",
        ),
      },
    ],
  },
  {
    value: 10,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "28 900 000",
          "135 × 78",
          "Obverse: King Oscar II and the coat of arms ringed by the arms of the diocesan towns.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "324 400 000",
          "127 × 72",
          "Obverse: W.F.K. Christie and Admiral Tordenskiold.",
          "Reverse: a St. Olav's rose, a stylised Viking king and the coat of arms.",
        ),
      },
      {
        series: "III",
        yearFrom: 1945,
        yearTo: 1954,
        details: issued(
          "228 700 000",
          "127 × 72",
          "Obverse: a vignette with the coat of arms.",
          "Reverse: the numerical denomination.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1954,
        yearTo: 1973,
        details: issued(
          "654 400 000",
          "125 × 70",
          "Obverse: Christian Michelsen, after a drawing by Erik Werenskiold.",
          "Reverse: Mercury and two ships, after a drawing by Henrik Sørensen.",
        ),
      },
      {
        series: "V",
        yearFrom: 1972,
        yearTo: 1984,
        details: issued(
          "744 900 000",
          "124 × 66",
          "Obverse: Fridtjof Nansen.",
          "Reverse: Nils Flakstad's sculpture The Fisherman.",
        ),
      },
    ],
  },
  {
    value: 50,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "1 800 000",
          "156 × 135",
          "Obverse: King Oscar II.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "31 490 000",
          "144 × 127",
          "Obverse: W.F.K. Christie.",
          "Reverse: Eidsvoll Manor.",
        ),
      },
      {
        series: "III",
        yearFrom: 1945,
        yearTo: 1951,
        details: issued(
          "17 720 000",
          "144 × 127",
          "Obverse: a vignette with the coat of arms.",
          "Reverse: a vignette with the words NORGES BANK.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1950,
        yearTo: 1965,
        details: issued(
          "53 450 000",
          "144 × 127",
          "Obverse: Bjørnstjerne Bjørnson, after a painting by Erik Werenskiold.",
          "Reverse: Hugo Lous Mohr's Harvesting Cereal.",
        ),
      },
      {
        series: "V",
        yearFrom: 1966,
        yearTo: 1983,
        details: issued(
          "148 320 000",
          "145 × 73",
          "Obverse: Bjørnstjerne Bjørnson.",
          "Reverse: Borgund stave church.",
        ),
      },
      {
        series: "VI",
        yearFrom: 1985,
        yearTo: 1997,
        details: [
          ...issued(
            "204 280 000",
            "135 × 67",
            "Obverse: Aasmund Olavsson Vinje.",
            "Reverse: a detail of the Hylestad stave church doorway.",
          ),
          "No longer legal tender from 28 January 2008.",
        ],
      },
      {
        series: "VII",
        yearFrom: 1997,
        details: [
          "Size: 128 × 60 mm.",
          "Obverse: Peter Christen Asbjørnsen.",
          "Issued on 20 January 1997; no longer legal tender from 18 October 2019.",
        ],
      },
      {
        series: "VIII",
        yearFrom: 2018,
        details: [
          "Size: 126 × 70 mm.",
          "Main motif: Utvær Lighthouse.",
          "Legal tender from 18 October 2018.",
        ],
      },
    ],
  },
  {
    value: 100,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "1 300 000",
          "156 × 135",
          "Obverse: King Oscar II.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "26 450 000",
          "144 × 127",
          "Obverse: W.F.K. Christie and Admiral Tordenskiold.",
          "Reverse: Håkon Hall.",
        ),
      },
      {
        series: "III",
        yearFrom: 1945,
        yearTo: 1950,
        details: issued(
          "21 050 000",
          "144 × 127",
          "Obverse: a vignette with the coat of arms.",
          "Reverse: the numerical denomination between the words NORGES BANK.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1949,
        yearTo: 1962,
        details: issued(
          "81 710 000",
          "144 × 127",
          "Obverse: Henrik Wergeland.",
          "Reverse: Erik Werenskiold's Men Working on a Timber Boom.",
        ),
      },
      {
        series: "V",
        yearFrom: 1962,
        yearTo: 1977,
        details: issued(
          "341 040 000",
          "145 × 78",
          "Obverse: Henrik Wergeland.",
          "Reverse: Oscar Wergeland's painting of the Constituent Assembly at Eidsvoll.",
        ),
      },
      {
        series: "VI",
        yearFrom: 1979,
        yearTo: 1997,
        details: [
          ...issued(
            "690 180 000",
            "145 × 78",
            "Obverse: Camilla Collett.",
            "Reverse: a rosette with a fifteenth-century silver buckle.",
          ),
          "No longer legal tender from 5 September 2008.",
        ],
      },
      {
        series: "VII",
        yearFrom: 1997,
        details: [
          "Size: 136 × 65 mm.",
          "Obverse: Kirsten Flagstad.",
          "Issued on 15 September 1997; no longer legal tender from 30 May 2018.",
        ],
      },
      {
        series: "VIII",
        yearFrom: 2017,
        details: [
          "Size: 133 × 70 mm.",
          "Main motif: the Gokstad ship.",
          "Legal tender from 30 May 2017.",
        ],
      },
    ],
  },
  {
    value: 200,
    notes: [
      {
        series: "VII",
        yearFrom: 1994,
        details: [
          "Size: 144 × 70 mm.",
          "Obverse: Kristian Birkeland.",
          "Issued on 1 November 1994; no longer legal tender from 30 May 2018.",
        ],
      },
      {
        series: "VIII",
        yearFrom: 2017,
        details: [
          "Size: 140 × 70 mm.",
          "Main motif: a cod.",
          "Legal tender from 30 May 2017.",
        ],
      },
    ],
  },
  {
    value: 500,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "500 000",
          "234 × 135",
          "Obverse: King Oscar II.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "524 000",
          "216 × 127",
          "Obverse: W.F.K. Christie.",
          "Reverse: Akershus Castle.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1948,
        yearTo: 1976,
        details: issued(
          "6 964 000",
          "216 × 127",
          "Obverse: Niels Henrik Abel, after a drawing by Johan Gørbitz.",
          "Reverse: an industrial motif by Reidar Aulie.",
        ),
      },
      {
        series: "V",
        yearFrom: 1978,
        yearTo: 1985,
        details: [
          ...issued(
            "8 400 000",
            "169 × 90",
            "Obverse: Niels Henrik Abel.",
            "Reverse: the University of Oslo's three original buildings.",
          ),
          "No longer legal tender from 21 June 2002.",
        ],
      },
      {
        series: "VI",
        yearFrom: 1991,
        yearTo: 2000,
        details: [
          ...issued(
            "40 902 000",
            "155 × 78",
            "Obverse: Edvard Grieg.",
            "Reverse: an antique floral ornament.",
          ),
          "No longer legal tender from 17 April 2011.",
        ],
      },
      {
        series: "VII",
        yearFrom: 1999,
        details: [
          "Size: 152 × 75 mm.",
          "Obverse: Sigrid Undset.",
          "Issued on 7 June 1999; no longer legal tender from 18 October 2019.",
        ],
      },
      {
        series: "VIII",
        yearFrom: 2018,
        details: [
          "Size: 147 × 70 mm.",
          "Main motif: the rescue vessel RS 14 Stavanger.",
          "Legal tender from 18 October 2018.",
        ],
      },
    ],
  },
  {
    value: 1000,
    notes: [
      {
        series: "I",
        yearFrom: 1877,
        yearTo: 1901,
        details: issued(
          "85 000",
          "234 × 135",
          "Obverse: King Oscar II and the arms of the diocesan towns.",
          "Reverse: a stylised Viking king and the coat of arms of Norway.",
        ),
      },
      {
        series: "II",
        yearFrom: 1901,
        yearTo: 1945,
        details: issued(
          "978 000",
          "216 × 127",
          "Obverse: W.F.K. Christie and Admiral Tordenskiold.",
          "Reverse: Nidaros Cathedral.",
        ),
      },
      {
        series: "III",
        yearFrom: 1945,
        yearTo: 1949,
        details: issued(
          "504 000",
          "216 × 127",
          "Obverse: W.F.K. Christie and Admiral Tordenskiold, as in series II with the word GULD printed over.",
          "Reverse: Nidaros Cathedral.",
        ),
      },
      {
        series: "IV",
        yearFrom: 1949,
        yearTo: 1975,
        details: issued(
          "5 936 000",
          "216 × 127",
          "Obverse: Henrik Ibsen.",
          "Reverse: Edvard Munch's History from the University of Oslo's Aula.",
        ),
      },
      {
        series: "V",
        yearFrom: 1975,
        yearTo: 1987,
        details: [
          ...issued(
            "51 930 000",
            "169 × 90",
            "Obverse: Henrik Ibsen.",
            "Reverse: Peder Balke's painting Lighthouse at Vardø.",
          ),
          "No longer legal tender from 1 August 2001.",
        ],
      },
      {
        series: "VI",
        yearFrom: 1990,
        yearTo: 2001,
        details: [
          ...issued(
            "56 525 000",
            "155 × 78",
            "Obverse: Christian Magnus Falsen.",
            "Reverse: a seventeenth-century cast-iron stove panel.",
          ),
          "No longer legal tender from 26 June 2012.",
        ],
      },
      {
        series: "VII",
        yearFrom: 2001,
        details: [
          "Size: 160 × 80 mm.",
          "Obverse: Edvard Munch.",
          "Issued on 19 June 2001; no longer legal tender from 14 November 2020.",
        ],
      },
      {
        series: "VIII",
        yearFrom: 2019,
        details: [
          "Size: 154 × 70 mm.",
          "Main motif: a wave in the open sea.",
          "Legal tender from 14 November 2019.",
        ],
      },
    ],
  },
];

const root = "no";

const yearsOf = (spans: Array<{ yearFrom: number; yearTo?: number }>) => {
  const open = spans.some(({ yearTo }) => yearTo === undefined);
  return {
    year_from: String(Math.min(...spans.map(({ yearFrom }) => yearFrom))),
    year_to: open
      ? ""
      : String(Math.max(...spans.map(({ yearTo = 0 }) => yearTo))),
  };
};

const coinYears = ({ yearFrom, yearTo }: Coin) =>
  yearTo === undefined
    ? `${yearFrom}–`
    : yearFrom === yearTo
      ? `${yearFrom}`
      : `${yearFrom}–${yearTo}`;

function coinRows(denomination: CoinDenomination, sortOrder: number): Row[] {
  const name = denominationOf(denomination);
  const key = `${root}-${denominationKey(denomination)}`;
  const all = denomination.series.flatMap(({ coins }) => coins);
  const shared = { item_type: "coin", country: "NO", denomination: name };
  return [
    {
      id: key,
      parent_id: root,
      title: `${denomination.value}-${denomination.unit} coins`,
      sort_order: String(sortOrder),
      is_addable: "false",
      ...shared,
      ...yearsOf(all),
      ...credit("facts", norgesBank(all[0]?.link ?? pages)),
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
          ...credit("facts", norgesBank(series.coins[0]?.link ?? pages)),
          ...(series.note && {
            historical_notes: series.note,
            ...credit("notes", editorial(series.coins[0]?.link ?? pages)),
          }),
        },
        ...series.coins.map((coin, index) => {
          const alloy = coin.alloy && alloys[coin.alloy];
          return {
            id: `${seriesKey}-${coin.key}`,
            parent_id: seriesKey,
            title: coin.title
              ? `${name} ${coinYears(coin)} – ${coin.title}`
              : `${name} ${coinYears(coin)}`,
            series: series.title,
            sort_order: String(index + 1),
            is_addable: "true",
            ...shared,
            material: coin.precious?.metal ?? alloy?.material ?? "",
            metal: coin.precious?.metal ?? "",
            fineness: coin.precious?.fineness ?? "",
            strike: coin.strike ?? "",
            weight_g: coin.weight ?? "",
            diameter_mm: coin.diameter ?? "",
            year_from: String(coin.yearFrom),
            year_to: coin.yearTo === undefined ? "" : String(coin.yearTo),
            ...credit("facts", norgesBank(coin.link)),
            technical_details: [alloy?.words, ...coin.details]
              .filter(Boolean)
              .join(" "),
            historical_notes: coin.note ?? "",
            ...credit("notes", editorial(coin.link)),
          };
        }),
      ];
    }),
  ];
}

function noteRows(denomination: NoteDenomination, sortOrder: number): Row[] {
  const name = denominationOf({ value: denomination.value, unit: "krone" });
  const key = `${root}-note-${denominationKey({ value: denomination.value, unit: "krone" })}`;
  const shared = { item_type: "banknote", country: "NO", denomination: name };
  return [
    {
      id: key,
      parent_id: root,
      title: `${denomination.value}-krone notes`,
      sort_order: String(sortOrder),
      is_addable: "false",
      ...shared,
      ...yearsOf(denomination.notes),
      ...credit("facts", norgesBank(`${withdrawn}/`)),
    },
    ...denomination.notes.flatMap((note, index) => {
      const series = noteSeries[note.series];
      const seriesKey = `${key}-${note.series.toLowerCase()}`;
      const span =
        note.yearTo === undefined
          ? `${note.yearFrom}–`
          : `${note.yearFrom}–${note.yearTo}`;
      return [
        {
          id: seriesKey,
          parent_id: key,
          title: series.title,
          series: series.title,
          sort_order: String(index + 1),
          is_addable: "false",
          ...shared,
          ...yearsOf([note]),
          ...credit("facts", norgesBank(series.link)),
          historical_notes: series.note,
          ...credit("notes", editorial(series.link)),
        },
        {
          id: `${seriesKey}-1`,
          parent_id: seriesKey,
          title: note.series.startsWith("small")
            ? `${name} ${span}`
            : `${name} ${span}, series ${note.series}`,
          series: series.title,
          sort_order: "1",
          is_addable: "true",
          ...shared,
          year_from: String(note.yearFrom),
          year_to: note.yearTo === undefined ? "" : String(note.yearTo),
          ...credit("facts", norgesBank(series.link)),
          technical_details: note.details.join(" "),
          ...credit("notes", editorial(series.link)),
        },
      ];
    }),
  ];
}

const rows: Row[] = [
  {
    id: root,
    title: "Norway",
    country: "NO",
    sort_order: "2",
    historical_notes:
      "The Money Act of 1875 replaced the speciedaler and skilling with the krone of 100 øre, and Norges Bank issued its first notes in kroner in 1877. Norges Bank has the sole right to issue Norway's notes and coins.",
    ...credit("notes", editorial(`${withdrawn}/Banknote-series-I/`)),
  },
  ...coinDenominations.flatMap((denomination, index) =>
    coinRows(denomination, index + 1),
  ),
  ...noteDenominations.flatMap((denomination, index) =>
    noteRows(denomination, coinDenominations.length + index + 1),
  ),
];

export const norway = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
