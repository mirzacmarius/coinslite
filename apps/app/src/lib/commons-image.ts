import {
  type ImageCredit,
  catalogImageLimits,
} from "@coinslite/backend/convex/catalog/imageRules";

/**
 * Catalog images from Wikimedia Commons: reading a file page through the
 * Commons API, deciding which of its licences governs the credit, and
 * filling the credit in. A coin photo usually carries two licences, the
 * photographer's and the design's, and the API's `extmetadata` often names
 * only the design's ("Public domain"), so every licence template and
 * category is read and the photo's licence governs
 * (docs/research/catalog-expansion.md §4.3).
 */

/** A licence a Commons file may be used under, by name and deed. */
export type CommonsLicence = { name: string; url: string };

/** Why a file can't be used: its licence isn't one CoinsLite may store. */
export type CommonsRefusal =
  /** Non-commercial use only (CC …-NC). */
  | "nonCommercial"
  /** No changes allowed (CC …-ND); converting to WebP is one. */
  | "noDerivatives"
  /** Non-free or fair use. */
  | "nonFree"
  /** Tagged as missing a licence, source or permission, as a copyright violation, or for deletion. */
  | "disputed"
  /**
   * Another licence or copyright notice (the GFDL alone, "no known
   * copyright restrictions", …), which a PD template for the design
   * doesn't lift.
   */
  | "otherLicence"
  /** No public-domain, CC0, CC BY or CC BY-SA licence found. */
  | "none";

export type LicenceVerdict =
  | { accepted: true; licence: CommonsLicence }
  | { accepted: false; reason: CommonsRefusal };

/** What a file page says about its licences. */
export type LicenceSignals = {
  /** Template names on the page, and the licences named inside {{self|…}}. */
  templates: readonly string[];
  /** Category names, without "Category:". */
  categories: readonly string[];
  /** The API's `extmetadata` licence code and name, when given. */
  extmetadata: readonly string[];
};

/**
 * Licence kinds in the order they govern: CC licences, the photo's own,
 * before public domain, which on a coin photo often covers only the design.
 * "other" is a licence that isn't accepted (GFDL, Free Art, …): beside a CC
 * licence it's an alternative the file is also offered under; without one
 * it refuses the file.
 */
const kinds = ["cc-by-sa", "cc-by", "cc0", "other", "pd"] as const;
type Kind = (typeof kinds)[number];

/** Refusals a single template or category gives, worst first. */
const tagRefusals = [
  "nonCommercial",
  "noDerivatives",
  "nonFree",
  "disputed",
] as const;

type Reading =
  | { kind: Kind; version?: string; port?: string }
  | { refusal: (typeof tagRefusals)[number] }
  | undefined;

/** "CC-BY-SA 4.0", "cc_by_sa_4.0" → "cc-by-sa-4.0". */
const normalize = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const patterns = {
  nonCommercial: /^cc-.*\bnc\b|^non-?commercial/,
  noDerivatives: /^cc-.*\bnd\b|^no-?derivative/,
  nonFree: /^(non-?free|fair-?use)/,
  disputed:
    /^(no-licen[cs]e|no-permission|no-source|media-without-a-(licen[cs]e|source)|media-missing-permission|(otrs|vrts)-pending|permission-pending|items-with-(otrs|vrts)-permission-pending|copyvio|copyright-violation|speedy|delete(-|$)|deletion-request)/,
  cc0: /^(cc-?zero|cc0)(-|$)/,
  pd: /^(cc-pd-mark|pdm|pd|public-domain)(-|$)/,
  // cc-by-sa-4.0, cc-by-3.0-de, cc-by-sa-3.0-igo, cc-by-sa-4.0,3.0,2.5, cc-by-sa-all
  cc: /^cc-(by-sa|by)(?:-(\d\.\d|all))?[,.\d]*(?:-([a-z]{2,3}))?(?:-|$)/,
  /** Headings ({{int:license-header}}) and tracking categories that name licences without being one. */
  tracking: /^int:|machine-readable|licen[cs]e-(migration|review)/,
  /** Any other licence, named or not (GFDL, Free Art, Licence Ouverte, …). */
  other:
    /^(gfdl|fal|free-art|attribution|copyrighted-free-use|ogl|odbl|gpl|lgpl|cc-)|licen[cs]e|lizenz|copyright/,
};

/**
 * What one licence template, category or `extmetadata` value says, or
 * undefined when it isn't about a licence.
 */
function readLicence(name: string): Reading {
  const token = normalize(name);
  for (const refusal of tagRefusals)
    if (patterns[refusal].test(token)) return { refusal };
  if (patterns.cc0.test(token)) return { kind: "cc0" };
  if (patterns.pd.test(token)) return { kind: "pd" };
  const cc = patterns.cc.exec(token);
  if (cc)
    return {
      kind: cc[1] === "by-sa" ? "cc-by-sa" : "cc-by",
      version: cc[2] === "all" ? "4.0" : cc[2],
      port: cc[3],
    };
  if (patterns.tracking.test(token)) return undefined;
  if (patterns.other.test(token)) return { kind: "other" };
  return undefined;
}

/**
 * The licence that governs a Commons file's credit, or why the file is
 * refused. Any non-commercial, no-derivatives, non-free or disputed tag
 * refuses it. Otherwise the most restrictive of CC BY-SA, CC BY and CC0
 * governs; without any, a licence that isn't accepted refuses the file, and
 * public domain (PD-* templates, the Public Domain Mark) is accepted. So a
 * photo's CC licence wins over its design's PD template.
 */
export function governingLicence(signals: LicenceSignals): LicenceVerdict {
  const readings = [
    ...signals.templates,
    ...signals.categories,
    ...signals.extmetadata,
  ].map(readLicence);
  for (const refusal of tagRefusals)
    if (
      readings.some(
        (reading) =>
          reading && "refusal" in reading && reading.refusal === refusal,
      )
    )
      return { accepted: false, reason: refusal };
  for (const kind of kinds) {
    const found = readings.filter(
      (reading): reading is Extract<Reading, { kind: Kind }> =>
        reading !== undefined && "kind" in reading && reading.kind === kind,
    );
    if (found.length === 0) continue;
    if (kind === "other") return { accepted: false, reason: "otherLicence" };
    return { accepted: true, licence: licenceOf(kind, found) };
  }
  return { accepted: false, reason: "none" };
}

/** A licence by name and deed: for CC BY(-SA), the newest version named. */
function licenceOf(
  kind: Exclude<Kind, "other">,
  found: readonly { version?: string; port?: string }[],
): CommonsLicence {
  if (kind === "pd")
    return {
      name: "Public domain",
      url: "https://creativecommons.org/publicdomain/mark/1.0/",
    };
  if (kind === "cc0")
    return {
      name: "CC0 1.0",
      url: "https://creativecommons.org/publicdomain/zero/1.0/",
    };
  const [label, path] =
    kind === "cc-by-sa" ? ["CC BY-SA", "by-sa"] : ["CC BY", "by"];
  // The newest version, an international one before a ported one.
  const newest = found
    .filter((reading) => reading.version)
    .sort(
      (a, b) =>
        Number(b.version) - Number(a.version) ||
        Number(Boolean(a.port)) - Number(Boolean(b.port)),
    )[0];
  if (!newest?.version)
    return { name: label, url: "https://creativecommons.org/licenses/" };
  const port = newest.port ? ` ${newest.port.toUpperCase()}` : "";
  const portPath = newest.port ? `${newest.port}/` : "";
  return {
    name: `${label} ${newest.version}${port}`,
    url: `https://creativecommons.org/licenses/${path}/${newest.version}/${portPath}`,
  };
}

/** Templates whose positional values name licences: {{self|cc-by-sa-4.0}}. */
const licenceWrappers =
  /^(self\d?|licen[cs]ed-|pd-art|pd-scan|multi-?licen[cs]e|dual-?licen[cs]e)/;

/**
 * The names of the templates used on a file page, and the licences named in
 * {{self|…}}, {{Licensed-PD-Art|…}} and the like (their positional values;
 * other templates' values are text, such as a description).
 */
function licenceTemplates(wikitext: string): string[] {
  const names: string[] = [];
  let text = wikitext;
  // Innermost templates first, until none are left, so nested ones count too.
  while (/\{\{[^{}]*\}\}/.test(text)) {
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const [name = "", ...values] = body.split("|");
      names.push(name);
      if (licenceWrappers.test(normalize(name)))
        names.push(...values.filter((value) => !value.includes("=")));
      return "";
    });
  }
  return names.map((name) => name.trim()).filter(Boolean);
}

/** One page of a Commons API `query` answer, as far as it's read here. */
type CommonsPage = {
  title?: string;
  missing?: boolean;
  invalid?: boolean;
  categories?: { title: string }[];
  revisions?: { slots?: { main?: { content?: string } } }[];
  imageinfo?: {
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    size?: number;
    mime?: string;
    extmetadata?: Record<string, { value?: unknown } | undefined>;
  }[];
};

/** The one page of a Commons API answer, if it has one. */
function pageOf(response: unknown): CommonsPage | undefined {
  const pages = (response as { query?: { pages?: unknown } } | null)?.query
    ?.pages;
  return Array.isArray(pages) ? (pages[0] as CommonsPage) : undefined;
}

/** A text value of the page's `extmetadata`, if it has it. */
function metadata(page: CommonsPage, key: string) {
  const value = page.imageinfo?.[0]?.extmetadata?.[key]?.value;
  return typeof value === "string" ? value : undefined;
}

/** What a Commons API answer for a file page says about its licences. */
export function licenceSignals(response: unknown): LicenceSignals {
  const page = pageOf(response) ?? {};
  return {
    templates: licenceTemplates(
      page.revisions?.[0]?.slots?.main?.content ?? "",
    ),
    categories: (page.categories ?? []).map(({ title }) =>
      title.replace(/^Category:/, ""),
    ),
    extmetadata: ["License", "LicenseShortName"]
      .map((key) => metadata(page, key))
      .filter((value): value is string => value !== undefined),
  };
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * The text an HTML snippet shows: tags and hidden elements removed,
 * character references decoded, white space collapsed.
 */
export function plainText(html: string): string {
  return html
    .replace(/<(\w+)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (reference, name: string) => {
      if (name[0] !== "#") return entities[name.toLowerCase()] ?? reference;
      const code =
        name[1] === "x" || name[1] === "X"
          ? Number.parseInt(name.slice(2), 16)
          : Number(name.slice(1));
      return code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : reference;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** The credit's source for every image from Commons. */
const commonsSource = "Wikimedia Commons";

/** Picture formats the browser converts, as Commons names them. */
const readableTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** A Commons file read for a Catalog image: where to download it and its credit. */
export type CommonsFile = {
  title: string;
  /** The picture to download: the original, or Commons' 1280 px copy of one the browser can't read (TIFF, SVG) or that's over 25 MB. */
  imageUrl: string;
  licence: CommonsLicence;
  credit: ImageCredit;
};

/** Why a Commons file can't be added. */
export type CommonsProblem =
  | CommonsRefusal
  /** No such file on Commons. */
  | "notFound"
  /** The file isn't a picture (a PDF, a video, a sound). */
  | "notPicture";

/**
 * A Commons file read for a Catalog image, from the API's answer for its
 * file page (see `commonsQueryUrl`), or why it can't be added. The credit
 * names the creator as the file page credits them (not the uploader; empty
 * when it names none), the governing licence with its deed and the change made,
 * and the file page.
 */
export function readCommonsFile(
  response: unknown,
): { file: CommonsFile } | { problem: CommonsProblem } {
  const page = pageOf(response);
  const info = page?.imageinfo?.[0];
  if (!page?.title || page.missing || page.invalid || !info?.descriptionurl)
    return { problem: "notFound" };
  if (!info.mime?.startsWith("image/") || !info.url)
    return { problem: "notPicture" };
  const verdict = governingLicence(licenceSignals(response));
  if (!verdict.accepted) return { problem: verdict.reason };
  const original =
    readableTypes.has(info.mime) &&
    (info.size ?? 0) <= catalogImageLimits.originalBytes;
  const imageUrl = original ? info.url : info.thumburl;
  if (!imageUrl) return { problem: "notPicture" };
  const { licence } = verdict;
  return {
    file: {
      title: page.title,
      imageUrl: withoutQuery(imageUrl),
      licence,
      credit: {
        source: commonsSource,
        // The attribution a CC licence asks for, if the page gives one, else
        // the creator from its {{Information}}.
        author: plainText(
          metadata(page, "Attribution") ?? metadata(page, "Artist") ?? "",
        ),
        licence: `${licence.name} (${licence.url}); resized and converted to WebP`,
        link: info.descriptionurl,
      },
    },
  };
}

/** An address without its query (Commons adds tracking parameters). */
function withoutQuery(address: string) {
  const url = new URL(address);
  url.search = "";
  return url.toString();
}

/** "File:1893-S_Morgan…" or "Image:…" → "File:1893-S Morgan…"; undefined when it isn't a file. */
function fileTitle(name: string | null | undefined) {
  if (!name) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    return undefined;
  }
  const match = /^(?:file|image):(.+)$/i.exec(
    decoded.replace(/_/g, " ").trim(),
  );
  const rest = match?.[1]?.trim();
  return rest ? `File:${rest}` : undefined;
}

/**
 * The title of the Commons file an address names ("File:…"): a file page
 * on commons.wikimedia.org (also its mobile site, `index.php?title=` and
 * `#/media/File:…` addresses) or the file itself on upload.wikimedia.org.
 * Undefined for anything else, files on other wikis included: those may be
 * under fair use.
 */
export function commonsFileTitle(address: string): string | undefined {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (url.hostname === "upload.wikimedia.org") {
    const name = /^\/wikipedia\/commons\/[\da-f]\/[\da-f]{2}\/([^/]+)$/.exec(
      url.pathname,
    )?.[1];
    return name ? fileTitle(`File:${name}`) : undefined;
  }
  if (!/^commons\.(m\.)?wikimedia\.org$/.test(url.hostname)) return undefined;
  return (
    fileTitle(/^#\/media\/(.+)$/.exec(url.hash)?.[1]) ??
    fileTitle(url.searchParams.get("title")) ??
    fileTitle(/^\/wiki\/(.+)$/.exec(url.pathname)?.[1])
  );
}

/** How CoinsLite identifies itself to Wikimedia's API (browsers can't set User-Agent). */
const apiUserAgent =
  "CoinsLite/1.0 (https://github.com/mirzacmarius/coinslite)";

/**
 * The Commons API address that reads a file page: its picture (the
 * original and a 1280 px copy), `extmetadata`, every category (licence
 * categories are hidden ones) and the page's wikitext, whose templates name
 * its licences. `origin=*` lets a browser read it without signing in.
 */
export function commonsQueryUrl(title: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    redirects: "1",
    titles: title,
    prop: "imageinfo|categories|revisions",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1280",
    cllimit: "max",
    rvprop: "content",
    rvslots: "main",
  }).toString();
  return url.toString();
}

/** Reads a Commons file page through the API, from the admin's browser. */
export async function fetchCommonsFile(title: string) {
  const response = await fetch(commonsQueryUrl(title), {
    headers: { "Api-User-Agent": apiUserAgent },
  });
  if (!response.ok) throw new Error(`Commons API failed (${response.status})`);
  return readCommonsFile(await response.json());
}

/**
 * Downloads a Commons file's picture into the admin's browser, to convert
 * and store it in CoinsLite's own storage: images are never linked to
 * Wikimedia's servers.
 */
export async function downloadCommonsPicture(imageUrl: string) {
  // A plain request: Wikimedia's file servers don't accept Api-User-Agent
  // from browsers.
  const response = await fetch(imageUrl);
  if (!response.ok)
    throw new Error(`Commons download failed (${response.status})`);
  return await response.blob();
}
