/**
 * Reads a Finnish coin decree, as Finlex's open data API serves it in Akoma
 * Ntoso XML, into the facts the Catalog keeps for each coin it issues. Pure,
 * so scripts/fetch-finlex-coins.ts can be checked against saved decrees.
 *
 * The Ministry of Finance words its decrees to a pattern that has changed
 * little since 1988: the coin's alloy, its diameter and weight, its finish,
 * the marks on it, then the design described. A decree that issues two
 * denominations gives the facts that differ in paragraphs beginning
 * "Nimellisarvoltaan 20 euron …", and one whose proofs are struck in another
 * alloy says so in a paragraph beginning "Erikoislyöntinen juhlaraha …".
 * Anything outside the pattern throws and stops the script, so a person
 * reads that decree by hand rather than a wrong fact being stored.
 */

export type DecreeSection = {
  /** "2 §" */
  num: string;
  paragraphs: string[];
};

export type Decree = {
  year: number;
  number: number;
  title: string;
  /** The decree an amending decree changes, by its year and number. */
  amends?: { year: number; number: number };
  sections: DecreeSection[];
};

export type DecreeCoin = {
  /** The coin's subject in Finnish, as the decree names it. */
  subject: string;
  /** "20 euro", "100 markkaa" */
  denomination: string;
  /**
   * A second coin of the same denomination: a proof the decree gives an
   * alloy of its own, or the one struck in gold and silver.
   */
  variant?: "proof" | "goldAndSilver";
  /** The year of issue: as the decree states it, else as the design dates the coin. */
  year: number;
  /** Set only where every coin is struck as a proof: with a mirror field. */
  strike?: "proof";
  material: "silver" | "gold" | "aluminiumBronze" | "bimetallic";
  metal?: "silver" | "gold";
  /** Parts per one of the precious metal. */
  fineness?: number;
  /** "silver 92.5%; copper 7.5%", the alloy as the decree gives it. */
  composition?: string;
  /** Grams. */
  weight: number;
  /** Millimetres. */
  diameter: number;
  edge?: "plain" | "reeded" | "lettered";
  edgeLettering?: string;
  mint?: string;
  /** The mint master's initial, where the decree gives it. */
  mintMark?: string;
  /** The obverse and reverse described, in the decree's words. */
  design: string;
};

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function clean(fragment: string) {
  return fragment
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/''/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const statutePath = /\/akn\/fi\/act\/statute\/(\d{4})\/(\d+)/;

export function readDecree(xml: string): Decree {
  const uri = /<FRBRuri value="([^"]+)"/.exec(xml)?.[1] ?? "";
  const [, year, number] = statutePath.exec(uri) ?? [];
  const title = clean(/<docTitle>([\s\S]*?)<\/docTitle>/.exec(xml)?.[1] ?? "");
  if (!year || !number || !title)
    throw new Error(`Not a statute: ${uri || xml.slice(0, 200)}`);
  const affected = /<affectedDocument href="([^"]+)"/.exec(xml)?.[1];
  const [, amendsYear, amendsNumber] = affected
    ? (statutePath.exec(affected) ?? [])
    : [];
  const sections = [...xml.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)]
    .map(([, section = ""]) => ({
      num: clean(/<num>([\s\S]*?)<\/num>/.exec(section)?.[1] ?? ""),
      paragraphs: [...section.matchAll(/<p>([\s\S]*?)<\/p>/g)]
        .map(([, paragraph = ""]) => clean(paragraph))
        .filter(Boolean),
    }))
    .filter((section) => section.paragraphs.length > 0);
  return {
    year: Number(year),
    number: Number(number),
    title,
    ...(amendsYear &&
      amendsNumber && {
        amends: { year: Number(amendsYear), number: Number(amendsNumber) },
      }),
    sections,
  };
}

/**
 * The decree as its amendments left it, applied oldest first: each amending
 * section replaces the section of that number.
 */
export function amended(decree: Decree, amendments: Decree[]): Decree {
  const sections = decree.sections.map((section) => ({ ...section }));
  const oldestFirst = [...amendments].sort(
    (a, b) => a.year - b.year || a.number - b.number,
  );
  for (const amendment of oldestFirst) {
    for (const change of amendment.sections) {
      const index = sections.findIndex(({ num }) => num === change.num);
      if (index === -1)
        throw new Error(
          `${amendment.number}/${amendment.year} changes ${change.num}, which ${decree.number}/${decree.year} doesn't have`,
        );
      sections[index] = { ...change };
    }
  }
  return { ...decree, sections };
}

const numberWords: Record<string, number> = {
  sadan: 100,
  "kahden tuhannen": 2000,
};
const denominationPattern =
  /\b(\d+|[Ss]adan|[Kk]ahden tuhannen) (euron|markan)\b/g;

type Denomination = { value: number; currency: "euro" | "markka" };

const label = ({ value, currency }: Denomination) =>
  currency === "euro"
    ? `${value} euro`
    : `${value} ${value === 1 ? "markka" : "markkaa"}`;
const sameDenomination = (a: Denomination, b: Denomination) =>
  a.value === b.value && a.currency === b.currency;

function denominationsIn(text: string): Denomination[] {
  const found: Denomination[] = [];
  for (const [, amount = "", unit] of text.matchAll(denominationPattern)) {
    const denomination: Denomination = {
      value: numberWords[amount.toLowerCase()] ?? Number(amount),
      currency: unit === "euron" ? "euro" : "markka",
    };
    if (!found.some((one) => sameDenomination(one, denomination)))
      found.push(denomination);
  }
  return found;
}

const decimal = (text: string) => Number(text.replace(",", "."));

/** "Valtiovarainministeriön asetus Tove Jansson -juhlarahasta": "Tove Jansson". */
function subjectOf(title: string, intro: string) {
  // "Valtioministeriön" is decree 231/2023's own spelling.
  const name = title
    .replace(
      /^(?:Valtiovarainministeriön|Valtioministeriön) (?:asetus|päätös) |^Asetus /,
      "",
    )
    .trim();
  const hyphenated = /^(.+?)\s*[-–]\s*juhlarahasta$/.exec(name);
  let subject = hyphenated?.[1];
  if (!subject) {
    const named =
      /^(.*)juhlarahan lyömisestä$/.exec(name) ??
      /^(.*)juhlarahasta$/.exec(name);
    if (!named) throw new Error(`No subject in the title "${title}"`);
    subject = `${(named[1] ?? "").replace(/lyötävästä $/, "lyötävä ")}juhlaraha`;
  }
  // "100 euron juhlarahasta" names no subject; its first section does.
  if (/^\d+ euron juhlaraha$/.test(subject)) {
    const theme = /jonka aiheena on (.+?)\./.exec(intro)?.[1];
    if (!theme) throw new Error(`No subject in "${title}"`);
    subject = theme;
  }
  subject = subject.replace(/^["”“]|["”“]$/g, "").trim();
  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
}

const metalNames: Record<string, string> = {
  hopeaa: "silver",
  kultaa: "gold",
  kuparia: "copper",
  alumiinia: "aluminium",
  sinkkiä: "zinc",
  tinaa: "tin",
  nikkeliä: "nickel",
};

type Alloy = Pick<
  DecreeCoin,
  "material" | "metal" | "fineness" | "composition"
>;

/** The alloy, from the sentence that gives it. */
function alloyOf(text: string): Alloy | undefined {
  if (/kaksimetalli|keskiosa|keskusta on|rengas/i.test(text))
    return { material: "bimetallic" };
  const sentence = /seosta, jonka painosta (.+?)\.(?:\s|$)/.exec(text)?.[1];
  if (!sentence) return undefined;
  const parts = [
    ...sentence.matchAll(
      /(\d+(?:,\d+)?) (promillea|prosenttia|prosentti) (?:on )?(hopeaa|kultaa|kuparia|alumiinia|sinkkiä|tinaa|nikkeliä)/g,
    ),
  ].map(([, amount = "", unit, metal = ""]) => ({
    metal: metalNames[metal] as string,
    percent: decimal(amount) / (unit === "promillea" ? 10 : 1),
  }));
  const total = parts.reduce((sum, { percent }) => sum + percent, 0);
  if (parts.length < 2 || Math.abs(total - 100) > 0.001)
    throw new Error(`An alloy that doesn't add up: ${sentence}`);
  const composition = parts
    .map(({ metal, percent }) => `${metal} ${Number(percent.toFixed(3))}%`)
    .join("; ");
  const [main] = [...parts].sort((a, b) => b.percent - a.percent);
  if (main?.metal === "silver" || main?.metal === "gold")
    return {
      material: main.metal,
      metal: main.metal,
      fineness: Number((main.percent / 100).toFixed(4)),
      composition,
    };
  // Copper with aluminium, zinc and tin: Nordic gold.
  if (main?.metal === "copper" && parts.some((p) => p.metal === "aluminium"))
    return { material: "aluminiumBronze", composition };
  throw new Error(`An alloy the Catalog has no material for: ${sentence}`);
}

/** The mint, by the mark or the master dies the decree says it holds. */
function mintOf(text: string) {
  if (/Liettuan raha-?pajan/.test(text)) return "Lithuanian Mint";
  if (/Alankomaiden Kuninkaallisen raha-?pajan/i.test(text))
    return "Royal Dutch Mint";
  if (/Suomen Rahapaja Oy/.test(text)) return "Suomen Rahapaja Oy";
  if (/Rahapaja Oy/.test(text)) return "Rahapaja Oy";
  if (/Suomen rahapajan hallussa/i.test(text)) return "Suomen Rahapaja";
  return undefined;
}

function edgeOf(
  paragraphs: string[],
): Pick<DecreeCoin, "edge" | "edgeLettering"> {
  for (const paragraph of paragraphs) {
    const lettering =
      /(?:lieriöpinnassa|syrjään) (?:on |tulee )?(?:syvennyksinä )?(?:teksti|kirjoitus) (.+?)\.?$/.exec(
        paragraph,
      )?.[1] ?? /teksti ([^.]+?) on rahan syrjässä/.exec(paragraph)?.[1];
    if (lettering)
      return {
        edge: "lettered",
        edgeLettering: lettering.replace(/^"(.*)"$/, "$1").trim(),
      };
  }
  if (paragraphs.some((p) => /täysin sileä syrjä|lieriöpinta on sileä/.test(p)))
    return { edge: "plain" };
  if (paragraphs.some((p) => /(?:reuna|syrjä) on rihlattu/.test(p)))
    return { edge: "reeded" };
  return {};
}

/**
 * The sections describing the design: the paragraphs after the one that
 * introduces the description ("… on seuraavan selitelmän ja kuvan
 * mukainen"), with the denomination that paragraph names, if only one.
 */
function designSectionsOf(decree: Decree) {
  return decree.sections.flatMap((section) => {
    const start = section.paragraphs.findIndex((p) => /selitelmän/.test(p));
    if (start === -1) return [];
    const named = denominationsIn(section.paragraphs[start] ?? "");
    return [
      {
        paragraphs: section.paragraphs.slice(start + 1),
        denomination: named.length === 1 ? named[0] : undefined,
      },
    ];
  });
}

/** The whole design described, for a decree read by hand. */
export const designOf = (decree: Decree) =>
  designSectionsOf(decree)
    .flatMap((section) => section.paragraphs)
    .join(" ");

/**
 * Each coin the decree issues, one per denomination, and a second for a
 * proof the decree gives an alloy of its own. `year` is the year of issue
 * for a decree that neither states it nor dates the design.
 */
export function coinsOf(
  decree: Decree,
  { year: givenYear }: { year?: number } = {},
): DecreeCoin[] {
  const all = decree.sections.flatMap((section) => section.paragraphs);
  const text = all.join(" ");
  if (/valmistetaan sekä/.test(text))
    throw new Error(
      `${decree.number}/${decree.year} issues one coin in two alloys; read it by hand`,
    );
  const intro = decree.sections[0]?.paragraphs.join(" ") ?? "";
  const subject = subjectOf(decree.title, intro);
  const denominations = denominationsIn(text);
  if (denominations.length === 0)
    throw new Error(`${decree.number}/${decree.year} names no denomination`);

  const designSections = designSectionsOf(decree);
  const designParagraphs = new Set(
    designSections.flatMap((section) => section.paragraphs),
  );
  const factParagraphs = all.filter((p) => !designParagraphs.has(p));
  const proofAlloy = (p: string) => /^Erikoislyöntinen juhlaraha/.test(p);

  return denominations.flatMap((denomination) => {
    /** The paragraphs about this coin: those naming it, then those naming no other denomination. */
    const aboutThisCoin = (paragraphs: string[]) => {
      const specific: string[] = [];
      const general: string[] = [];
      for (const paragraph of paragraphs) {
        const named = denominationsIn(paragraph);
        if (named.length === 1 && denominations.length > 1) {
          if (sameDenomination(named[0] as Denomination, denomination))
            specific.push(paragraph);
        } else general.push(paragraph);
      }
      return [...specific, ...general];
    };
    const facts = aboutThisCoin(factParagraphs);
    const design = designSections
      .filter(
        (section) =>
          !section.denomination ||
          sameDenomination(section.denomination, denomination),
      )
      .flatMap((section) => section.paragraphs);
    const designText = design.join(" ");
    if (!designText)
      throw new Error(`${decree.number}/${decree.year} describes no design`);

    const measure = (pattern: RegExp, what: string) => {
      for (const paragraph of facts) {
        const found = pattern.exec(paragraph)?.[1];
        if (found) return decimal(found);
      }
      throw new Error(
        `${decree.number}/${decree.year} gives no ${what} for ${label(denomination)}`,
      );
    };
    const diameter = measure(/halkaisija(?: on)? (\d+(?:,\d+)?)/, "diameter");
    const weight = measure(/paino(?: on)? (\d+(?:,\d+)?)/, "weight");

    const statedYear = /Vuonna (\d{4}) (?:julkaistaan|lyödään)/.exec(
      intro,
    )?.[1];
    const datedYears = [
      ...new Set(
        [...designText.matchAll(/\b(\d{4})\b/g)]
          .map(([, year]) => Number(year))
          .filter((year) => year >= decree.year && year <= decree.year + 1),
      ),
    ];
    const year = givenYear ?? (statedYear ? Number(statedYear) : datedYears[0]);
    if (!year || (!givenYear && !statedYear && datedYears.length > 1))
      throw new Error(
        `${decree.number}/${decree.year} dates ${label(denomination)} ${datedYears.join(" or ") || "nowhere"}`,
      );

    const mintMark = facts
      .map(
        (p) =>
          !/voi (?:lisäksi )?olla/.test(p) &&
          // The mint master's initial comes after the artist's: "P ja M".
          /johtajan sukunim(?:en|ien) alkukirjai(?:n|met) (?:[A-ZÅÄÖ]+ ja )?([A-ZÅÄÖ])(?![\p{L}])/u.exec(
            p,
          )?.[1],
      )
      .find(Boolean);
    const mint = mintOf(text);
    const edge = edgeOf([...facts, ...design]);
    const variants: Array<"proof" | undefined> = facts.some(proofAlloy)
      ? [undefined, "proof"]
      : [undefined];

    // The finish may be given among the facts or at the end of the design.
    const finish = [...facts, ...design];
    const someProofs = finish.some((p) =>
      /^Osa\b.*erikoislyön|^Osa lyöntimäärästä/.test(p),
    );
    const allProofs =
      !someProofs &&
      finish.some((p) =>
        /erikoislyöntinä|^Rahoissa on peilikiiltoinen/.test(p),
      ) &&
      /peilikiiltoi/.test(finish.join(" "));

    return variants.map((variant): DecreeCoin => {
      const alloyText = (
        variant === "proof"
          ? [...facts.filter(proofAlloy), ...facts]
          : facts.filter((p) => !proofAlloy(p))
      )
        .filter((p) => /promillea|prosentti|%|keskiosa|kaksimetalli/.test(p))
        .filter((p) => !/poiketa/.test(p) || /seosta/.test(p))
        .join(" ");
      const alloy = alloyOf(alloyText);
      if (!alloy)
        throw new Error(
          `${decree.number}/${decree.year} gives no alloy for ${label(denomination)}`,
        );
      const strike = variant === "proof" || allProofs ? "proof" : undefined;
      return {
        subject,
        denomination: label(denomination),
        ...(variant && { variant }),
        year,
        ...(strike && { strike }),
        ...alloy,
        weight,
        diameter,
        ...edge,
        ...(mint && { mint }),
        ...(mintMark && { mintMark }),
        design: designText,
      };
    });
  });
}
