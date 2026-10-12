/**
 * Reading the European Central Bank's pages on euro coins, and the regulation
 * that sets their alloys, into plain values. Pure, so it can be tested on a
 * saved page; scripts/fetch-euro-circulation-coins.ts fetches the pages.
 */

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** A fragment of a page as plain words: paragraphs and line breaks become spaces, other tags go. */
export function plainText(fragment: string) {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<\/?(?:p|div|br|li|ul|h\d)\b[^>]*>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/[ \s]+/g, " ")
    .replace(/​/g, "")
    .trim();
}

const mainOf = (html: string) =>
  html.slice(html.indexOf("<main"), html.indexOf("</main>"));

/** One issuer's national side of a denomination, as the ECB's page shows it. */
export type NationalSide = {
  /** The issuer's name as the page heads it. */
  issuer: string;
  /** The issuer's own page on the ECB's site: "mo" for /euro/coins/html/mo.en.html. */
  page: string;
  /** The file names of the pictures, one per design series, oldest first. */
  pictures: string[];
  /** What the page says about the issuer's coins of this denomination. */
  text: string;
};

/**
 * The national sides on the ECB's page for one denomination, in any of its
 * languages: each issuer's box, with a picture for each design series.
 */
export function nationalSides(html: string): NationalSide[] {
  return mainOf(html)
    .split('<div class="box"')
    .slice(1)
    .map((box) => {
      const link = /<a href="\/euro\/coins\/html\/(\w+)\.\w+\.html"/.exec(box);
      const heading = box.indexOf("</h3>");
      return {
        issuer: plainText(/<h3>(.*?)<\/h3>/s.exec(box)?.[1] ?? ""),
        page: link?.[1] ?? "",
        pictures: [...box.matchAll(/<img src="([^"]+)"/g)].map(
          ([, src = ""]) => src.split("/").at(-1) ?? src,
        ),
        text: plainText(
          box.slice(heading + "</h3>".length, link ? link.index : box.length),
        ),
      };
    });
}

/** One denomination's common side, from the ECB's page on the common sides. */
export type CommonSide = {
  /** "2euro", "50cent", as the page's pictures name them. */
  picture: string;
  /** The labelled facts in page order: diameter, thickness, weight, shape, colour, composition, edge. */
  facts: Array<{ label: string; value: string }>;
};

/** Every denomination's specifications on the ECB's page on the common sides, in any of its languages. */
export function commonSides(html: string): CommonSide[] {
  return mainOf(html)
    .split('<div class="box"')
    .slice(1)
    .map((box) => ({
      picture:
        /common_(\d+(?:euro|cent))/.exec(box)?.[1] ??
        // Some pages name the 10-cent pictures "10common.jpg".
        /\/(\d+)common\./
          .exec(box)?.[1]
          ?.concat("cent") ??
        "",
      facts: [
        ...box
          .slice(box.indexOf('class="content-box"'))
          .matchAll(/<strong>(.*?)<\/strong>(.*?)(?=<br|<strong>|<\/div>)/gs),
      ].map(([, label = "", value = ""]) => ({
        label: plainText(label).replace(/\s*:$/, ""),
        value: plainText(value),
      })),
    }));
}

/**
 * When each euro-area member first issued euro cash, from the ECB's page on
 * joining the euro area: "Euro since 1999 (cash since 2002)", or "Euro since
 * 2026" for a country whose cash came with the euro. By the page's name.
 */
export function cashYears(html: string): Record<string, number> {
  const text = plainText(mainOf(html));
  const years: Record<string, number> = {};
  for (const [, name = "", euro, cash] of text.matchAll(
    /((?:\p{Lu}\p{Ll}+ )+)EU member using the euro EU (?:founding member in|member since) \d{4} Euro since (\d{4})(?: \(cash since (\d{4})\))?/gu,
  )) {
    years[name.trim()] = Number(cash ?? euro);
  }
  return years;
}

/** Nordic gold's alloy, in percent, from the regulation's table of specifications: "Cu89Al5Zn5Sn1". */
export function nordicGold(html: string) {
  const match =
    /Nordic Gold\s*(?:<[^>]*>|\s|&#xD;)*Cu(\d+)Al(\d+)Zn(\d+)Sn(\d+)/i.exec(
      html,
    );
  if (!match) return undefined;
  const [, copper, aluminium, zinc, tin] = match.map(Number);
  return { copper, aluminium, zinc, tin } as Record<
    "copper" | "aluminium" | "zinc" | "tin",
    number
  >;
}
