/**
 * Reads a royal proclamation under the Coinage Act 1971, as The Gazette
 * serves it (a notice's data.xml), into the facts the Catalog keeps: each new
 * coin it makes, with its denomination, metal, standard weight, diameter,
 * composition and shape, and each design it determines, with the obverse,
 * every reverse it allows and the edge. Pure, so scripts/fetch-uk-coins.ts
 * can be checked against saved notices.
 *
 * Proclamations are semi-structured English. This reads the form they have
 * taken since The Gazette began publishing notices as data in 1998: clauses
 * that each make "a new coin of <metal> of the denomination of
 * <denomination>", and clauses giving "the design of the said coins".
 * Anything it can't read is left out, never guessed.
 */

/** A metal and its share of a coin, as the proclamation gives it. */
export type Part = { metal: string; percent: number };

export type ProclaimedCoin = {
  /** "50 pence", "1 penny", "2 pounds". */
  denomination: string;
  /** The coin's metal, in the proclamation's words: "cupro-nickel". */
  metal: string;
  /** Standard weight, grams. */
  weight?: number;
  /** Standard diameter, millimetres. */
  diameter?: number;
  composition?: Part[];
  /** A coin of joined inner and outer sections of different alloys. */
  sections?: { inner: Part[]; outer: Part[] };
  /** "circular", "equilateral curve heptagon", "twelve sided". */
  shape?: string;
  /** The index in `designs` of the design it bears. */
  design?: number;
};

export type Edge =
  | { edge: "plain" | "reeded" | "interruptedReeding" }
  | { edge: "lettered"; lettering: string };

export type Reverse = {
  /** The reverse described, in the proclamation's words. */
  description: string;
  /** The coins it is for, where the proclamation restricts it: "cupro-nickel coins". */
  onlyFor?: string;
  /** Its own edge, where each reverse has one. */
  edge?: Edge;
  /** Its own obverse, where an option restates the obverse differently. */
  obverse?: string;
};

export type ProclaimedDesign = {
  /** The obverse described: "Our effigy with the inscription …". */
  obverse?: string;
  /** Each reverse the proclamation allows, one per design. */
  reverses: Reverse[];
  /** The edge of every reverse, where the proclamation gives one for all. */
  edge?: Edge;
  /** The design clause in full, in the proclamation's words. */
  text: string;
};

/** Words an altering proclamation puts in place of others. */
export type Substitution = { from: string; to: string };

export type Proclamation = {
  /** The Gazette's notice ID. */
  notice: string;
  /** "London", "Edinburgh" or "Belfast". */
  edition?: string;
  /** The heading after "A Proclamation", as The Gazette prints it; for a notice with none, its opening words. */
  title: string;
  /** YYYY-MM-DD, when The Gazette published it. */
  published?: string;
  /** YYYY-MM-DD, the day it was given at Court. */
  given?: string;
  /** YYYY-MM-DD, the day it came into force. */
  inForce?: string;
  /** It makes coins to commemorate or celebrate something, by its title or recital. */
  commemorative: boolean;
  /** Why they are made, as the recital words it: "to commemorate the life and work of Beatrix Potter". */
  occasion?: string;
  /** For a proclamation altering earlier ones: the days those were given, YYYY-MM-DD. */
  alters?: string[];
  /** Its changes to their words: "for ‘2018’ there shall be substituted ‘and the date of the year’". */
  substitutions?: Substitution[];
  coins: ProclaimedCoin[];
  designs: ProclaimedDesign[];
};

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Paragraph breaks in the flattened text. */
const breakMark = " ¶ ";

/** The notice's content as one line, with its paragraph breaks marked. */
function textOf(xml: string) {
  const start = xml.indexOf('class="content"');
  const end = xml.indexOf("</article>", start);
  const content = xml.slice(xml.indexOf(">", start) + 1, end);
  return content
    .replace(/\s+/g, " ")
    .replace(/<\/(p|h\d|div|li|td|tr)>/g, breakMark)
    .replace(/<br\s*\/?>/g, breakMark)
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/[\s ]+/g, " ")
    .replace(/(?: ¶)+ /g, breakMark)
    .trim();
}

/** Text as it reads: no paragraph marks, single spaces, no space before punctuation. */
const squash = (text: string) =>
  text
    .replace(/¶/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:)’”])/g, "$1")
    .replace(/([(‘“])\s+/g, "$1")
    .trim();

const units: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const tens: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** "seventy-five" is 75, "five and one half" 5.5, "9" 9; undefined for anything else. */
function numberIn(words: string): number | undefined {
  const text = words.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const half = /^(.+?) and (?:one|a) half$/.exec(text);
  if (half) {
    const whole = numberIn(half[1] as string);
    return whole === undefined ? undefined : whole + 0.5;
  }
  const [first = "", second, ...rest] = text.split(/[\s-]+/);
  if (rest.length > 0) return undefined;
  if (second === undefined) return units[first] ?? tens[first];
  const ten = tens[first];
  const unit = units[second];
  return ten !== undefined && unit !== undefined && unit < 10
    ? ten + unit
    : undefined;
}

const ordinals: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  thirtieth: 30,
};
const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "fifteenth" is 15, "twenty-first" 21, "3rd" 3. */
function dayIn(words: string) {
  const text = words.trim().toLowerCase();
  const digits = /^(\d{1,2})(st|nd|rd|th)?$/.exec(text);
  if (digits) return Number(digits[1]);
  const [first = "", second] = text.split(/[\s-]+/);
  if (second === undefined) return ordinals[first];
  const ten = tens[first];
  const unit = ordinals[second];
  return ten !== undefined && unit !== undefined && unit < 10
    ? ten + unit
    : undefined;
}

/** "Two thousand and seventeen" is 2017; "One thousand nine hundred and ninety-eight" 1998. */
function yearIn(words: string) {
  const text = words
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(one|two)-thousand/, "$1 thousand");
  if (/^\d{4}$/.test(text)) return Number(text);
  const match =
    /^(one|two) thousand(?: (\w+) hundred)?(?: and ([a-z]+(?:-[a-z]+)?))?$/.exec(
      text,
    );
  if (!match) return undefined;
  const thousands = match[1] === "one" ? 1000 : 2000;
  const hundreds = match[2] === undefined ? 0 : (units[match[2]] ?? Number.NaN);
  const rest = match[3] === undefined ? 0 : (numberIn(match[3]) ?? Number.NaN);
  const year = thousands + hundreds * 100 + rest;
  return Number.isInteger(year) ? year : undefined;
}

function isoDate(year?: number, month?: number, day?: number) {
  if (!year || !month || !day) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return undefined;
  return date.toISOString().slice(0, 10);
}

const dayPattern =
  "(\\d{1,2}(?:st|nd|rd|th)?|[a-z]+(?:-[a-z]+|\\s(?!day\\b|of\\b)[a-z]+)?)";
const monthPattern = `(${months.join("|")})`;
const yearPattern =
  "(\\d{4}|(?:one|two)[\\s-]+thousand(?:\\s+[a-z]+\\s+hundred)?(?:\\s+and\\s+[a-z]+(?:-[a-z]+)?)?)";

/** "the sixteenth day of February Two thousand and seventeen", after `lead`. */
function dateAfter(text: string, lead: string) {
  const pattern = new RegExp(
    `${lead}\\s+(?:the\\s+)?${dayPattern}\\s+(?:day\\s+)?of\\s+${monthPattern}\\s*,?\\s+(?:in\\s+the\\s+year\\s+of\\s+Our\\s+Lord\\s+)?${yearPattern}(?![a-z-])`,
    "i",
  );
  const match = pattern.exec(text.replace(/¶/g, " ").replace(/\s+/g, " "));
  if (!match) return undefined;
  return isoDate(
    yearIn(match[3] as string),
    months.indexOf((match[2] as string).toLowerCase()) + 1,
    dayIn(match[1] as string),
  );
}

/**
 * The days of the proclamations an altering proclamation's heading names:
 * "ALTERING THE PROCLAMATIONS OF THE ELEVENTH DAY OF OCTOBER AND THE
 * FIFTEENTH DAY OF NOVEMBER 2023" names 2023-10-11 and 2023-11-15.
 */
function altered(title: string) {
  const named = [
    ...title.matchAll(
      new RegExp(
        `\\bTHE\\s+${dayPattern}\\s+(?:(?:DAY\\s+)?OF\\s+)?${monthPattern}(?:,?\\s+(\\d{4}))?`,
        "gi",
      ),
    ),
  ].map((match) => ({
    day: dayIn(match[1] as string),
    month: months.indexOf((match[2] as string).toLowerCase()) + 1,
    year: match[3] === undefined ? undefined : Number(match[3]),
  }));
  // A day named without its year takes the year of the next one named.
  return named
    .map(({ day, month, year }, index) =>
      isoDate(
        year ?? named.slice(index + 1).find((next) => next.year)?.year,
        month,
        day,
      ),
    )
    .filter((date): date is string => date !== undefined);
}

/** "fifty pence" reads "50 pence", "one pound" "1 pound", "two-pounds" "2 pounds". */
function denominationIn(words: string) {
  const match = /^(.+?)[\s-](penny|pence|pounds?)$/i.exec(words.trim());
  if (!match) return undefined;
  const amount = numberIn(match[1] as string);
  if (amount === undefined) return undefined;
  if (/^pounds?$/i.test(match[2] as string))
    return `${amount} ${amount === 1 ? "pound" : "pounds"}`;
  return `${amount} ${amount === 1 ? "penny" : "pence"}`;
}

/** The metals of an alloy: "seventy-five per centum copper and twenty-five per centum nickel". */
function partsIn(text: string): Part[] | undefined {
  const parts: Part[] = [];
  const pattern =
    /(\d+(?:\.\d+)?|[a-z]+(?:-[a-z]+)?(?: and (?:one|a) half)?) per (?:centum|cent\.?) (?:of )?(mild steel|[a-z]+)/gi;
  for (const match of text.matchAll(pattern)) {
    const percent = numberIn(match[1] as string);
    if (percent === undefined) return undefined;
    const metal = (match[2] as string).toLowerCase();
    parts.push({ metal: metal === "mild steel" ? "steel" : metal, percent });
  }
  const fine = /(\d+(?:\.\d+)?) parts per thousand (?:fine )?([a-z]+)/i.exec(
    text,
  );
  if (parts.length === 0 && fine)
    parts.push({
      metal: (fine[2] as string).toLowerCase(),
      percent: Number(fine[1]) / 10,
    });
  return parts.length > 0 ? parts : undefined;
}

/** "A new coin of cupro-nickel of the denomination of fifty pence shall be made, being a coin …", to the sentence's end. */
const coinPattern =
  /\bA new coin of ([a-z ,-]+?) of the denomination of ([a-z -]+?) shall be made,? being a coin (.+?)(?=\s\(\d+\)\s|¶|$)/gi;

function coinFrom(match: RegExpMatchArray): ProclaimedCoin | undefined {
  const denomination = denominationIn(match[2] as string);
  if (!denomination) return undefined;
  const spec = squash(match[3] as string);
  const coin: ProclaimedCoin = {
    denomination,
    metal: squash(match[1] as string)
      .replace(/[\s,]+$/, "")
      .toLowerCase(),
  };
  const weight =
    /standard weight(?: \([^)]*\))? of (\d+(?:\.\d+)?) grammes/i.exec(spec);
  if (weight) coin.weight = Number(weight[1]);
  const diameter = /standard diameter of (\d+(?:\.\d+)?) millimetres/i.exec(
    spec,
  );
  if (diameter) coin.diameter = Number(diameter[1]);
  const sections =
    /standard composition as to the inner section of (.+?),? and as to the outer section of (.+?)(?:;|, and being|, being|\.\s|\.?$)/i.exec(
      spec,
    );
  if (sections) {
    const inner = partsIn(sections[1] as string);
    const outer = partsIn(sections[2] as string);
    if (inner && outer) coin.sections = { inner, outer };
  } else {
    const composition =
      /standard composition(?: \([^)]*\))? of (?:\([^)]*\) )?(.+?)(?:, and being|, being| and being|;|\.\s|\.?$)/i.exec(
        spec,
      );
    const parts = composition && partsIn(composition[1] as string);
    if (parts) coin.composition = parts;
    else {
      const fineness =
        /millesimal fineness of (?:not less than )?(\d+(?:\.\d+)?)/i.exec(spec);
      if (fineness && /^gold\b/.test(coin.metal))
        coin.composition = [
          { metal: "gold", percent: Number(fineness[1]) / 10 },
        ];
    }
  }
  const shape =
    /being (?:in the shape of (?:an? )?([a-z -]+?)|([a-z -]+?) in shape)(?=[,.;]| and\b|$)/i.exec(
      spec,
    );
  if (shape) coin.shape = ((shape[1] ?? shape[2]) as string).toLowerCase();
  return coin;
}

/**
 * A sentence about the edge, to its full stop or semicolon, quoted lettering
 * whole: "The coins shall have a plain edge.", "The coin shall have a grained
 * edge and in incuse letters the inscription “WE’LL MEET AGAIN”;".
 */
const edgeSentence =
  /(?:\bIn this case,?\s+)?\bThe (?:said )?(?:[a-z ,-]+ )?(?:coins?|version) (?:shall|will) have\b(?:“[^”]*”|[^.;“])*(?:[.;]|$)/gi;

/** Lettering quoted with “…”, "…" or ‘…’, or else in capitals. */
const letteringPattern =
  /(?:inscription|lettering|letters)\s+(?:“([^”]+)”|"([^"]+)"|‘(.+?)’(?![a-z])|([A-Z][A-Z0-9 .,'’&-]*[A-Z]))/;

function edgeIn(text: string): Edge | undefined {
  const said = (text.match(edgeSentence) ?? []).join(" ");
  if (!said) return undefined;
  const lettering = letteringPattern.exec(said);
  if (lettering) {
    const words = lettering.slice(1).find((group) => group !== undefined);
    return {
      edge: "lettered",
      lettering: squash(words as string).replace(/^[\s·∙.,]+|[\s·∙.,]+$/g, ""),
    };
  }
  if (/alternate grained and plain/i.test(said))
    return { edge: "interruptedReeding" };
  if (/grain(ed|ing)|mill(ed|ing)/i.test(said)) return { edge: "reeded" };
  if (/plain edge/i.test(said)) return { edge: "plain" };
  return undefined;
}

/** Where the reverse is described: "and for the reverse …", "The reverse design shows …". */
const reverseLead =
  /(?:\bfor the reverse|\bThe reverse)(?: designs?| impressions?)?(?: (?:shows|depicts|is|shall be))?(?: either)?:?\s*/i;
/** Where the obverse's description ends and the reverse's starts. */
const obverseEnd =
  /,?\s*(?:and\s+|;\s*(?:and\s+)?)?for the reverse\b|\.\s*The reverse\b/i;

/** An option's label: "(a)", "(iv)", "a)". */
const label = "\\(?(?:[a-z]|[ivx]{1,5})\\)";
/**
 * A label that lost its brackets when the list was published: "a a design
 * …; b the inscription …; aa a design …", known by the article after it.
 */
const bareLabel = "(?:[a-z]|([a-z])\\1)\\s+(?=(?:a|an|the)\\s)";
/** What the next option is restricted to, at the end of an option: "; or, for the cupro-nickel coins:". */
const restriction =
  /[;,]?\s*(?:or\s*,?\s*)?(?:and\s+)?for the ([a-z ,-]+? coins?)(?: only)?:?\s*$/i;

/** The end of an option: its joining "; or", a closing quotation mark, a full stop. */
function trimOption(text: string): string {
  const trimmed = text
    .replace(/^[\s‘,;:—–-]+/, "")
    // The number of the clause after the design: "… “TWO POUNDS”. 6."
    .replace(/([.”’])[\s’]*\d{1,2}\.?\s*$/, "$1")
    .replace(/(?:[\s.;,’]|\bor|\band)+$/i, "")
    .trim();
  // The close of a section an altering proclamation substitutes, in quotes.
  const opened = trimmed.split("“").length;
  const closed = trimmed.split("”").length;
  return closed > opened && trimmed.endsWith("”")
    ? trimOption(trimmed.slice(0, -1))
    : trimmed;
}

type Option = {
  text: string;
  onlyFor?: string;
  edge?: Edge;
  obverse?: string;
};

/** Options, each with the coins the option before it restricted it to, and the edge it gives. */
function optionsIn(chunks: string[]): Option[] {
  const options: Option[] = [];
  let onlyFor: string | undefined;
  for (const chunk of chunks) {
    const restricted = restriction.exec(chunk);
    const said = restricted ? chunk.slice(0, restricted.index) : chunk;
    const edge = edgeIn(said);
    const text = trimOption(said.replace(edgeSentence, " "));
    if (text)
      options.push({
        text,
        ...(onlyFor && { onlyFor }),
        ...(edge && { edge }),
      });
    onlyFor = restricted ? (restricted[1] as string).toLowerCase() : undefined;
  }
  return options;
}

/** One reverse, or each of "either: (a) …; (b) …; or (c) …". */
function reversesIn(said: string, onlyFor?: string): Option[] {
  const text = said.replace(/^either\s*[:—–-]?\s*/i, "").trim();
  const labelled = new RegExp(`(?:^|[;:]\\s*(?:or\\s+)?)${label}\\s`, "i");
  const bare = /^a\s+(?=(?:a|an|the)\s)/i;
  const chunks = labelled.test(text)
    ? text.split(new RegExp(`(?:^|;?\\s*(?:or\\s+|and\\s+)?)${label}\\s+`, "i"))
    : bare.test(text)
      ? text
          .split(new RegExp(`(?:^|;\\s*(?:or\\s+)?)${bareLabel}`, "i"))
          .filter((chunk) => chunk !== undefined && !/^[a-z]$/i.test(chunk))
      : text.split(/;\s*or\s+/i);
  return optionsIn(chunks).map((option) => {
    const restricted = option.onlyFor ?? onlyFor;
    return { ...option, ...(restricted && { onlyFor: restricted }) };
  });
}

function designFrom(clause: string): ProclaimedDesign {
  const text = squash(clause)
    .replace(/^[‘'"“]\s*(?=For\b)/, "")
    .replace(/([.])\s*[’'"”]\s*$/, "$1")
    .trim();
  // Each option may restate the obverse: "(a) For the obverse … ; or (b) For the obverse …".
  const options = optionsIn(
    text.split(
      new RegExp(
        `(?:^|;?\\s*(?:or\\s+)?)${label}\\s+(?=‘?For the obverse)|;\\s*or\\s+(?=‘?For the obverse)`,
        "i",
      ),
    ),
  ).filter((option) => /For the obverse/i.test(option.text));
  const sides = (options.length > 1 ? options : [{ text }]).map(
    ({ text: option, onlyFor, edge }: Option) => {
      const start =
        /\bFor the obverse(?: impression)?,?(?: either)?:?\s+/i.exec(option);
      const end = obverseEnd.exec(option);
      const obverse =
        start && end && end.index > start.index
          ? option.slice(start.index + start[0].length, end.index).trim()
          : undefined;
      const lead = reverseLead.exec(option);
      const reverses = lead
        ? reversesIn(option.slice(lead.index + lead[0].length), onlyFor)
        : [];
      return {
        obverse,
        reverses: reverses.map((reverse) => ({
          ...reverse,
          ...(!reverse.edge && edge && { edge }),
          ...(obverse && { obverse }),
        })),
      };
    },
  );
  const obverse = sides.find((side) => side.obverse)?.obverse;
  const reverses = sides.flatMap((side) => side.reverses);
  // An edge said once, after the last option, is every option's.
  const withEdge = reverses.filter((reverse) => reverse.edge);
  const shared =
    withEdge.length === 0
      ? edgeIn(text)
      : withEdge.length === 1 && reverses.at(-1)?.edge
        ? reverses.at(-1)?.edge
        : undefined;
  return {
    ...(obverse && { obverse }),
    reverses: reverses.map(
      ({ text: description, onlyFor, edge, obverse: own }) => ({
        description,
        ...(onlyFor && { onlyFor }),
        ...(edge && !shared && { edge }),
        // An option that restates the obverse differently keeps its own.
        ...(own && own !== obverse && { obverse: own }),
      }),
    ),
    ...(shared && { edge: shared }),
    text,
  };
}

/** "The design of the said two pound coins shall be as follows:". */
const designLead =
  /\bThe designs? (?:of|for) the said (?:[a-z ,-]+ )?coins? (?:shall|will) be(?: either| as follows)?:?\s*/gi;
/** Where a design clause ends: the next numbered clause, heading, coin or design, or the close. */
const clauseEnd =
  /¶\s*\d{1,2}\.?\s+(?:\(\d+\)\s*)?(?=[A-Z(])|\s\d{1,2}\.\s+(?:\(\d+\)\s*)?(?=[A-Z(])|¶\s*\(\d+\)\s|¶\s*[A-Z][A-Z ,’'-]{3,}¶|\bA new coin of\b|\bThe designs? (?:of|for) the said\b|\bThis Proclamation shall\b|\bGiven at\b|\bGOD SAVE\b/;

/**
 * Each proclamation in a notice; a few early notices print several, each
 * headed "By the Queen, A Proclamation".
 */
export function parseNotice(xml: string): Proclamation[] {
  const text = textOf(xml);
  const notice =
    /property="gaz:hasNoticeID">([^<]+)</.exec(xml)?.[1]?.trim() ??
    /Notice ID:\s*<\/dt>\s*<dd[^>]*>([^<]+)</.exec(xml)?.[1]?.trim() ??
    "";
  const edition = /property="gaz:editionName">([^<]+)</.exec(xml)?.[1]?.trim();
  const published = /<time datetime="(\d{4}-\d{2}-\d{2})/.exec(xml)?.[1];
  const starts = [
    ...text.matchAll(
      /\bBY THE (?:QUEEN|KING)\s*(?:¶\s*)?A\s*P\s*roclamation/gi,
    ),
  ].map((match) => match.index ?? 0);
  const parts =
    starts.length > 1
      ? starts.map((start, index) => text.slice(start, starts[index + 1]))
      : [text];
  return parts.map((part) => ({
    notice,
    ...(edition && { edition }),
    ...(published && { published }),
    ...proclamationIn(part),
  }));
}

function proclamationIn(
  text: string,
): Omit<Proclamation, "notice" | "edition" | "published"> {
  // Some notices leave out "A Proclamation"; an Order in Council has no
  // heading, so its opening words stand in.
  const heading =
    /\bBY THE (?:QUEEN|KING)\s*(?:¶\s*)?(?:A\s*P\s*roclamation\s*)?(.+?)\s+(?:¶\s*)?(?:ELIZABETH|CHARLES) R\b/i.exec(
      text,
    )?.[1];
  const title = squash(heading ?? text.slice(0, 160).replace(/\s\S*$/, "…"));

  type Found = { at: number; coin?: ProclaimedCoin; design?: string };
  const found: Found[] = [];
  for (const match of text.matchAll(coinPattern)) {
    const coin = coinFrom(match);
    if (coin) found.push({ at: match.index ?? 0, coin });
  }
  for (const match of text.matchAll(designLead)) {
    const start = (match.index ?? 0) + match[0].length;
    const rest = text.slice(start);
    const end = clauseEnd.exec(rest);
    found.push({
      at: match.index ?? 0,
      design: rest.slice(0, end ? end.index : rest.length),
    });
  }
  found.sort((a, b) => a.at - b.at);

  const coins: ProclaimedCoin[] = [];
  const designs: ProclaimedDesign[] = [];
  let undesigned: ProclaimedCoin[] = [];
  for (const { coin, design } of found) {
    if (coin) {
      coins.push(coin);
      undesigned.push(coin);
    } else if (design !== undefined) {
      designs.push(designFrom(design));
      for (const designed of undesigned) designed.design = designs.length - 1;
      undesigned = [];
    }
  }

  const recital = /desirable to order that,?\s+(.+?)(?::|¶)/i.exec(text)?.[1];
  const occasion =
    recital &&
    /^(?:in order\s+)?(to\s+(?:commemorate|celebrate|mark)\s+.+?),?\s+there should be made/i.exec(
      recital,
    )?.[1];
  const given = dateAfter(text, "this");
  const inForce = dateAfter(text, "come into force on");
  const alters = /^ALTERING\b/i.test(title) ? altered(title) : [];
  const substitutions = [
    ...text.matchAll(
      /\bfor\s+(?:‘(.+?)’|“(.+?)”)\s+there shall be substituted:?\s+(?:‘(.+?)’|“(.+?)”)\s*\.?\s*(?=¶|$)/gi,
    ),
  ].map((match) => ({
    from: squash((match[1] ?? match[2]) as string),
    to: squash((match[3] ?? match[4]) as string),
  }));
  return {
    title,
    ...(given && { given }),
    ...(inForce && { inForce }),
    commemorative: /commemorat|celebrat|\bto mark\b|\bmarking\b/i.test(
      `${title} ${recital ?? ""}`,
    ),
    ...(occasion && { occasion: squash(occasion) }),
    ...(alters.length > 0 && { alters }),
    ...(substitutions.length > 0 && { substitutions }),
    coins,
    designs,
  };
}
