// Transcribed by hand from the royal proclamations of 1968 to 1997 that The
// Gazette has only as scanned pages, and from Schedule 1 to the Decimal
// Currency Act 1967 on legislation.gov.uk. Each page's text layer was read
// by script to find the proclamations; every value here was then checked
// against the scanned page itself, as the text layer has errors ("QTH
// OCTOBER", "SO PENCE" for "50 PENCE").
// Contains public sector information licensed under the Open Government
// Licence v3.0.
//
// The proclamations' words are kept as printed, misprints and all
// ("ELIZBETH", "Aromial", the dates "1946" and "1994" on the Bank of England
// two pounds); only quotation marks and apostrophes are made typographic.
//
// Conventions, as in unitedKingdomCoins.ts:
// - one record per design of a base-metal coin of 1 penny to 2 pounds (and,
//   before 1984, the half penny), the coin made to circulate;
// - `year` is the date the coin bears where its proclamation fixes it,
//   else the year the proclamation came into force; the bronze coins of 1968
//   bear "the date 1971, or of a succeeding year", so their year is 1971;
// - a proclamation that alters an earlier one's design gives only its new
//   reverses here: a reverse proclaimed again unchanged is the same design.
//
// Left out: the 1982 one pound of "mixed metal" (Gazette 48889, p. 1985),
// revoked by the proclamation of 20 April 1983 before any was issued; the
// twenty-five pence crowns; coins of gold and silver; and the proclamations
// for Gibraltar and the Falkland Islands that the Gazette also printed.

import type { UkCoinDesign } from "./unitedKingdomCoins";

const gazettePage = (issue: number, page: number) =>
  `https://www.thegazette.co.uk/London/issue/${issue}/page/${page}`;

/** Schedule 1 to the Decimal Currency Act 1967, as enacted. */
export const decimalCurrencyAct1967 = {
  source: "legislation.gov.uk (Decimal Currency Act 1967, Schedule 1)",
  link: "https://www.legislation.gov.uk/ukpga/1967/47/enacted",
  words: "Schedule 1 to the Decimal Currency Act 1967",
};

/** Where a coin's standard weight, diameter and composition are given, when not on its design's page. */
export type UkCoinSpecification = {
  /** "The Gazette (royal proclamation)", or the Act on legislation.gov.uk. */
  source: string;
  link: string;
  /** How the technical details name it: "Schedule 1 to the Decimal Currency Act 1967". */
  words: string;
};

/** A design transcribed from a scanned page of The Gazette. */
export type UkScannedCoinDesign = Omit<UkCoinDesign, "denomination"> & {
  denomination: UkCoinDesign["denomination"] | "½ penny";
  /** What the reverse shows, in the proclamation's words, where its opening words don't say. */
  subject?: string;
  /** Where the weight, diameter and composition come from, when not the design's page. */
  specification?: UkCoinSpecification;
};

const gazetteProclamation = (issue: number, page: number, words: string) => ({
  source: "The Gazette (royal proclamation)",
  link: gazettePage(issue, page),
  words,
});

const lettered = (lettering: string) =>
  ({ edge: "lettered", lettering }) as const;

const cuproNickel = [
  { metal: "copper", percent: 75 },
  { metal: "nickel", percent: 25 },
];
const nickelBrass = [
  { metal: "copper", percent: 70 },
  { metal: "nickel", percent: 5.5 },
  { metal: "zinc", percent: 24.5 },
];

// London Gazette 44527, p. 1947: given 14 February 1968, in force 17 February 1968.
const decimal1968 = {
  notice: "London Gazette 44527, p. 1947",
  link: gazettePage(44527, 1947),
  proclamation: "Determining New Designs for Cupro-Nickel and Bronze Coins",
  given: "1968-02-14",
  inForce: "1968-02-17",
  series: "definitive",
  specification: decimalCurrencyAct1967,
} as const;
const cuproNickel1968 = {
  ...decimal1968,
  year: 1968,
  metal: "cupro-nickel",
  composition: cuproNickel,
  obverse:
    "Our effigy with the inscription “D·G·REG·F·D·ELIZABETH·II” and the date of the year",
  edge: { edge: "reeded" },
} as const;
const bronze1968 = {
  ...decimal1968,
  year: 1971,
  metal: "bronze",
  obverse:
    "Our effigy with the inscription “D·G·REG·F·D·ELIZABETH·II” and the date 1971, or of a succeeding year",
  edge: { edge: "plain" },
} as const;

// London Gazette 44749, pp. 13765–6: given 20 December 1968, in force 27 December 1968.
const fiftyNewPence = {
  notice: "London Gazette 44749, p. 13766",
  link: gazettePage(44749, 13766),
  proclamation:
    "Determining the Specifications and Design for, and Giving Currency to, a Fifty New Pence Coin",
  given: "1968-12-20",
  inForce: "1968-12-27",
  series: "definitive",
  denomination: "50 pence",
  year: 1968,
  metal: "cupro-nickel",
  weight: 13.5,
  diameter: 30,
  composition: cuproNickel,
  shape: "equilateral curve heptagon",
  obverse:
    "Our effigy with the inscription “D·G·REG·F·D·ELIZBETH II” and the date of the year",
  reverse:
    "a figure of Britannia, seated beside a lion, with a shield resting against her right side, holding a trident in her right hand and an olive branch in her left hand; and the inscription “50 NEW PENCE”",
  edge: { edge: "plain" },
  specification: gazetteProclamation(
    44749,
    13765,
    "the proclamation of 20 December 1968, London Gazette 44749, p. 13765",
  ),
} as const;

// London Gazette 49328, p. 5509: given 20 April 1983, in force 21 April 1983.
const onePound1983 = gazetteProclamation(
  49328,
  5509,
  "the proclamation of 20 April 1983, London Gazette 49328, p. 5509",
);
const onePound = {
  denomination: "1 pound",
  series: "definitive",
  metal: "nickel-brass",
  weight: 9.5,
  diameter: 22.5,
  composition: nickelBrass,
  shape: "circular",
} as const;

const twoPounds = {
  denomination: "2 pounds",
  series: "commemorative",
  metal: "nickel-brass",
  weight: 15.976,
  diameter: 28.4,
  composition: nickelBrass,
  shape: "circular",
} as const;

/** Every design, by denomination, then the date its proclamation came into force. */
export const ukScannedCoinDesigns: UkScannedCoinDesign[] = [
  // ½ penny
  {
    ...bronze1968,
    denomination: "½ penny",
    weight: 1.782,
    diameter: 17.145,
    reverse: "the Royal Crown, and the inscription “½ NEW PENNY”",
  },
  // 1 penny
  {
    ...bronze1968,
    denomination: "1 penny",
    weight: 3.564,
    diameter: 20.32,
    reverse:
      "a portcullis with chains royally crowned, being a badge of King Henry VII and his successors, and the inscription “1 NEW PENNY”",
  },
  {
    notice: "London Gazette 52998, p. 12418",
    link: gazettePage(52998, 12418),
    proclamation:
      "Determining the specifications and design for two pence and one penny coins",
    given: "1992-07-15",
    inForce: "1992-07-16",
    series: "definitive",
    denomination: "1 penny",
    year: 1992,
    metal: "mild steel coated with copper",
    weight: 3.564,
    diameter: 20.32,
    composition: [
      { metal: "steel", percent: 91 },
      { metal: "copper", percent: 9 },
    ],
    shape: "circular",
    obverse:
      "Our effigy with the inscription “ELIZABETH II D.G.REG.F.D.” and the date of the year",
    reverse:
      "a portcullis with chains royally crowned, being a badge of King Henry VII and His successors, the figure “1” and the words “ONE PENNY”",
    edge: { edge: "plain" },
    specification: gazetteProclamation(
      52998,
      12417,
      "the proclamation of 15 July 1992, London Gazette 52998, p. 12417",
    ),
  },
  // 2 pence
  {
    ...bronze1968,
    denomination: "2 pence",
    weight: 7.128,
    diameter: 25.91,
    reverse:
      "the badge of the Prince of Wales, being three ostrich feathers enfiling a coronet of crosses pattée and fluers de lys with the motto “ICH DIEN”, and the inscription “2 NEW PENCE”",
  },
  {
    notice: "London Gazette 52998, p. 12417",
    link: gazettePage(52998, 12417),
    proclamation:
      "Determining the specifications and design for two pence and one penny coins",
    given: "1992-07-15",
    inForce: "1992-07-16",
    series: "definitive",
    denomination: "2 pence",
    year: 1992,
    metal: "mild steel coated with copper",
    weight: 7.128,
    diameter: 25.91,
    composition: [
      { metal: "steel", percent: 93 },
      { metal: "copper", percent: 7 },
    ],
    shape: "circular",
    obverse:
      "Our effigy with the inscription “ELIZABETH II D.G.REG.F.D.” and the date of the year",
    reverse:
      "the badge of the Prince of Wales, being three ostrich feathers enfiling a coronet of crosses pattee and fleurs de lys with the motto “ICH DIEN”, the figure “2” and the words “TWO PENCE”",
    edge: { edge: "plain" },
  },
  // 5 pence
  {
    ...cuproNickel1968,
    denomination: "5 pence",
    weight: 5.65518,
    diameter: 23.595,
    reverse:
      "a thistle royally crowned, being the badge of Scotland, and the inscription “5 NEW PENCE”",
  },
  {
    notice: "London Gazette 52012, p. 342",
    link: gazettePage(52012, 342),
    proclamation:
      "Determining the Specifications and Design for Five Pence Coins",
    // The proclamation names no day it comes into force: the day it was given.
    given: "1989-12-19",
    inForce: "1989-12-19",
    series: "definitive",
    denomination: "5 pence",
    year: 1989,
    metal: "cupro-nickel",
    weight: 3.25,
    diameter: 18,
    composition: cuproNickel,
    shape: "circular",
    obverse:
      "Our effigy with the inscription “Elizabeth II D.G.REG.F.D.” and the date of the year",
    reverse:
      "a thistle royally crowned, being the badge of Scotland, the figure “5” and the words “FIVE PENCE”",
    edge: { edge: "reeded" },
    specification: gazetteProclamation(
      52012,
      341,
      "the proclamation of 19 December 1989, London Gazette 52012, p. 341",
    ),
  },
  // 10 pence
  {
    ...cuproNickel1968,
    denomination: "10 pence",
    weight: 11.31036,
    diameter: 28.5,
    reverse:
      "a lion passant guardant royally crowned, being part of the crest of England, and the inscription “10 NEW PENCE”",
  },
  // 20 pence
  {
    notice: "London Gazette 48889, p. 1986",
    link: gazettePage(48889, 1986),
    proclamation:
      "Determining the Specifications and Design for a Twenty Pence Coin",
    given: "1982-02-10",
    inForce: "1982-02-11",
    series: "definitive",
    denomination: "20 pence",
    year: 1982,
    metal: "cupro-nickel",
    weight: 5,
    diameter: 21.4,
    composition: [
      { metal: "copper", percent: 84 },
      { metal: "nickel", percent: 16 },
    ],
    shape: "equilateral curve heptagon",
    obverse:
      "Our effigy with the inscription “ELIZABETH II” above and “D·G·REG·F·D·” below",
    reverse:
      "the Royal Badge of the Rose of England represented as a double rose barbed and seeded, slipped and leaved and ensigned by a Royal Crown and the date of the year with the inscription “Twenty Pence” above and the figures “20” superimposed on the stem of the rose",
    subject: "Royal Badge of the Rose of England",
    edge: { edge: "plain" },
    specification: gazetteProclamation(
      48889,
      1985,
      "the proclamation of 10 February 1982, London Gazette 48889, p. 1985",
    ),
  },
  // 50 pence
  fiftyNewPence,
  {
    notice: "London Gazette 45859, p. 15309",
    link: gazettePage(45859, 15309),
    proclamation:
      "Determining the Design for the Fifty New Pence Coins Commemorating the Accession of the United Kingdom of Great Britain and Northern Ireland to the European Communities",
    given: "1972-12-20",
    inForce: "1972-12-29",
    purpose:
      "to commemorate the accession of the United Kingdom of Great Britain and Northern Ireland to the European Communities on the first day of January, One thousand nine hundred and seventy-three",
    series: "commemorative",
    denomination: "50 pence",
    year: 1972,
    metal: "cupro-nickel",
    weight: 13.5,
    diameter: 30,
    composition: cuproNickel,
    shape: "equilateral curve heptagon",
    obverse: "Our Effigy with the inscription “ELIZABETH II D.G. REG. F.D.”",
    reverse:
      "the inscription “50 PENCE” and the date of the year, surrounded by nine hands, symbolising the nine members of the Community, clasping one another in a mutual gesture of trust, assistance and friendship",
    subject: "Nine hands",
    edge: { edge: "plain" },
    specification: fiftyNewPence.specification,
  },
  {
    notice: "London Gazette 53490, p. 18526",
    link: gazettePage(53490, 18526),
    proclamation:
      "Determining the specification and design for fifty pence coins commemorating the Fiftieth Anniversary of the D-Day Landings",
    given: "1993-11-16",
    inForce: "1993-11-17",
    purpose:
      "to commemorate in the year One thousand nine hundred and ninety-four the fiftieth anniversary of the D-Day landings",
    series: "commemorative",
    denomination: "50 pence",
    year: 1993,
    metal: "cupro-nickel",
    weight: 13.5,
    diameter: 30,
    composition: cuproNickel,
    shape: "equilateral curve heptagon",
    obverse:
      "Our effigy with the inscription “ELIZABETH II D.G.REG.F.D.” and the date of the year",
    reverse:
      "a design representing the Allied invasion force heading for Normandy and filling the sea and sky, together with the value “50 PENCE”",
    edge: { edge: "plain" },
    specification: gazetteProclamation(
      53490,
      18525,
      "the proclamation of 16 November 1993, London Gazette 53490, p. 18525",
    ),
  },
  // 1 pound
  {
    ...onePound,
    notice: "London Gazette 49328, p. 5509",
    link: onePound1983.link,
    proclamation:
      "Determining the Specification and Design of a One Pound Coin and Determining the Amount for which the Said Coin is to be Legal Tender",
    given: "1983-04-20",
    inForce: "1983-04-21",
    year: 1983,
    obverse:
      "Our effigy with the inscription “ELIZABETH · II D · G · REG · F · D ·” and the date of the year",
    reverse:
      "the Ensigns Aromial of Our United Kingdom of Great Britain and Northern Ireland and beneath the same the words “ONE POUND”",
    subject: "Ensigns Armorial of Our United Kingdom",
    edge: lettered("DECUS ET TUTAMEN"),
  },
  ...(
    [
      [
        "an Oak Tree enfiling a representation of Our Royal Diadem",
        "DECUS ET TUTAMEN",
      ],
      [
        "a Thistle eradicated enfiling a representation of Our Royal Diadem",
        "NEMO ME IMPUNE LACESSIT",
      ],
      [
        "a Leek eradicated enfiling a representation of Our Royal Diadem",
        "PLEIDIOL WYF I’M GWLAD",
      ],
      [
        "a Flax Plant eradicated enfiling a representation of Our Royal Diadem",
        "DECUS ET TUTAMEN",
      ],
    ] as const
  ).map(
    ([reverse, lettering]): UkScannedCoinDesign => ({
      ...onePound,
      notice: "London Gazette 49397, p. 8379",
      link: gazettePage(49397, 8379),
      proclamation:
        "Altering the Proclamation of the 20th April 1983 Determining the Design for the One Pound Coin",
      given: "1983-06-22",
      inForce: "1983-06-23",
      year: 1983,
      obverse:
        "Our effigy with the inscription “ELIZABETH·II D·G·REG·F·D·” and the date of the year",
      reverse: `${reverse} and beneath the same words “ONE POUND”`,
      edge: lettered(lettering),
      specification: onePound1983,
    }),
  ),
  {
    ...onePound,
    notice: "London Gazette 51345, p. 6095",
    link: gazettePage(51345, 6095),
    proclamation:
      "Altering the Proclamation of the 20th April 1983 determining the design for the One Pound Coin",
    given: "1988-03-23",
    inForce: "1988-04-21",
    year: 1988,
    obverse:
      "Our effigy with the inscription “ELIZABETH.II D.G.REG.F.D.” and the date of the year",
    reverse:
      "a Shield of Our Royal Arms ensigned by a representation of the Royal Crown and beneath the same the words “ONE POUND”",
    edge: lettered("DECUS ET TUTAMEN"),
    specification: onePound1983,
  },
  ...(
    [
      [
        "three Lions passant guardant, being that quartering of Our Royal Arms known heraldically as England",
        "DECUS ET TUTAMEN",
      ],
      [
        "a Lion rampant within a double Tressure flory counter-flory, being that quartering of Our Royal Arms known heraldically as Scotland",
        "NEMO ME IMPUNE LACESSIT",
      ],
      [
        "a Dragon passant, being Our Royal badge of Wales",
        "PLEIDIOL WYF I’M GWLAD",
      ],
      [
        "a Celtic Cross charged at the centre with an Annulet therein a Pimpernel flower and overal an ancient Torque, in allusion to that part of Our United Kingdom known as Northern Ireland",
        "DECUS ET TUTAMEN",
      ],
    ] as const
  ).map(
    ([reverse, lettering]): UkScannedCoinDesign => ({
      ...onePound,
      notice: "London Gazette 53475, p. 17680",
      link: gazettePage(53475, 17680),
      proclamation:
        "Altering the Proclamation of 11th February 1983 and the Proclamation of 20th April 1983 and Determining the Design for One Pound Coins",
      given: "1993-10-27",
      inForce: "1993-10-28",
      year: 1993,
      obverse:
        "Our effigy with the inscription “ELIZABETH II D.G.REG.F.D.” and the date of the year",
      reverse: `${reverse} and beneath the same the words “ONE POUND”`,
      edge: lettered(lettering),
      specification: onePound1983,
    }),
  ),
  // 2 pounds
  {
    ...twoPounds,
    notice: "London Gazette 50357, p. 18122",
    link: gazettePage(50357, 18122),
    proclamation:
      "Determining the Specifications and Design for Two Pound Coins commemorating the XIII Commonwealth Games, to be held in Scotland, and providing for related matters",
    given: "1985-12-18",
    inForce: "1985-12-19",
    purpose:
      "to commemorate the XIII Commonwealth Games, to be held in Scotland in the year One thousand nine hundred and eighty-six",
    year: 1986,
    coinDate: 1986,
    obverse:
      "Our effigy with the inscription “ELIZABETH·II·DEI·GRATIA·REGINA·F·D” and the words “TWO POUNDS”",
    reverse:
      "a St. Andrew’s cross surmounted in chief by a crown triumphal overall a Thistle of Scotland and the date of the year “1986”",
    subject: "St. Andrew’s cross and a Thistle of Scotland",
    edge: lettered("XIII COMMONWEALTH GAMES SCOTLAND 1986"),
  },
  ...(
    [
      [
        "a Cypher of the letters W and M interlaced and surmounting a Parliamentary Mace horizontally placed and having a representation of the Royal Crown above and the dates 1689 and 1989 below, all within the inscription “TERCENTENARY OF THE BILL OF RIGHTS”",
        "“TERCENTENARY OF THE BILL OF RIGHTS”",
      ],
      [
        "a Cypher of the letters W and M interlaced and surmounting a Parliamentary Mace horizontally placed and having a representation of the Crown of Scotland above and the dates 1689 and 1989 below, all within the inscription “TERCENTENARY OF THE CLAIM OF RIGHT”",
        "“TERCENTENARY OF THE CLAIM OF RIGHT”",
      ],
    ] as const
  ).map(
    ([reverse, subject]): UkScannedCoinDesign => ({
      ...twoPounds,
      notice: "London Gazette 51607, p. 226",
      link: gazettePage(51607, 226),
      proclamation:
        "Determining the specifications and designs for Silver and Nickel-Brass Two-pounds Coins Commemorating the Tercentenary of the Bill of Rights and the Tercentenary of the Scottish claim of Right and determining that the said Nickel-Brass Coins shall have Currency and the amount for which they shall be Legal Tender",
      given: "1988-12-21",
      inForce: "1988-12-22",
      purpose:
        "in commemoration of the tercentenary of the Bill of Rights and the tercentenary of the Scottish Claim of Right in the year One thousand nine hundred and eighty-nine",
      year: 1989,
      coinDate: 1989,
      obverse:
        "Our effigy with the inscription “ELIZABETH. II.DEI.GRATIA. REGINA.F.D” and the words “TWO POUNDS”",
      reverse,
      subject,
      edge: { edge: "reeded" },
    }),
  ),
  {
    ...twoPounds,
    notice: "London Gazette 53475, p. 17680",
    link: gazettePage(53475, 17680),
    proclamation:
      "Determining the specifications and design for two-pound coins commemorating the tercentenary of the Bank of England and providing for related matters",
    given: "1993-10-27",
    inForce: "1993-10-28",
    purpose:
      "to commemorate the tercentenary of the Bank of England in the year One thousand nine hundred and ninety-four",
    year: 1994,
    coinDate: 1994,
    obverse:
      "Our effigy with the inscription “ELIZABETH.II.DEI.GRATIA.REGINA.F.D” and the words “TWO POUNDS”",
    reverse:
      "a central medallion bearing a representation of the Seal of the Bank of England showing a female figure habited in classical attire representing Britannia looking upon a bank of money holding aloft in the left hand a sprig of olive and with the right hand supporting a spear and resting upon a Cartouche bearing the Cross of St. George all within a laurel wreath and exterior to which the dates “1946” to the left and “1994” to the right, in chief a cypher comprising the interlaced letters “W” and “M” ensigned by a representation of the Royal Crown all accompanied by four roundels each bearing a shield debruised overall by a Cross couped arranged 2 and 2, and in base the words “Bank of England”",
    subject: "Seal of the Bank of England",
    edge: lettered("SIC VOS NON VOBIS"),
    specification: gazetteProclamation(
      53475,
      17679,
      "the proclamation of 27 October 1993, London Gazette 53475, p. 17679",
    ),
  },
  {
    ...twoPounds,
    notice: "London Gazette 53864, p. 16758",
    link: gazettePage(53864, 16758),
    proclamation:
      "Determining the Specifications and Design for Two-Pound Coins Commemorating the Fiftieth Anniversary of the End of the Second World War",
    given: "1994-11-24",
    inForce: "1994-11-25",
    purpose:
      "to commemorate in the year One thousand nine hundred and ninety-five the fiftieth anniversary of the end of the Second World War",
    year: 1995,
    coinDate: 1995,
    obverse:
      "Our effigy with the inscription “ELIZABETH.II.DEI.GRATIA.REGINA.F.D.” and the words “TWO POUNDS”",
    reverse: "a stylised representation of a dove as the symbol of peace",
    edge: lettered("1945 IN PEACE GOODWILL 1995"),
    specification: gazetteProclamation(
      53864,
      16757,
      "the proclamation of 24 November 1994, London Gazette 53864, p. 16757",
    ),
  },
  {
    ...twoPounds,
    notice: "London Gazette 53963, p. 2512",
    link: gazettePage(53963, 2512),
    proclamation:
      "Determining the Specifications and Design for Two-pound Coins Commemorating the Fiftieth Anniversary of the Establishment of the United Nations",
    given: "1995-02-08",
    inForce: "1995-02-09",
    purpose:
      "to commemorate in the year One thousand nine hundred and ninety-five the fiftieth anniversary of the establishment of the United Nations",
    year: 1995,
    coinDate: 1995,
    obverse:
      "Our effigy with the inscription “ELIZABETH.II.DEI.GRATIA.REGINA.F.D” and the words “TWO POUNDS”",
    reverse:
      "the fiftieth anniversary symbol of the United Nations and a fanning pattern of flags, with the inscription “NATIONS UNITED FOR PEACE” above and the dates “1945-1995” below",
    subject: "Fiftieth anniversary symbol of the United Nations",
    edge: { edge: "reeded" },
    specification: gazetteProclamation(
      53963,
      2511,
      "the proclamation of 8 February 1995, London Gazette 53963, p. 2511",
    ),
  },
  {
    ...twoPounds,
    notice: "London Gazette 54228, p. 16192",
    link: gazettePage(54228, 16192),
    proclamation:
      "Determining the Specifications and Design for Two-pound Coins commemorating the hosting of the European Football Championship in England in 1996",
    given: "1995-11-23",
    inForce: "1995-11-24",
    purpose:
      "to commemorate in the year One thousand nine hundred and ninety-six the hosting of the European Football Championship in England",
    year: 1996,
    coinDate: 1996,
    obverse:
      "Our effigy with the inscription “ELIZABETH.II.DEI.GRATIA.REGINA.F.D.” and the words “TWO POUNDS”",
    reverse:
      "a stylised representation of a football, with the date of the year “1996” centrally placed and encircled by sixteen small rings",
    edge: lettered("TENTH EUROPEAN CHAMPIONSHIP"),
    specification: gazetteProclamation(
      54228,
      16191,
      "the proclamation of 23 November 1995, London Gazette 54228, p. 16191",
    ),
  },
];
