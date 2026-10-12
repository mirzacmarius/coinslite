import { describe, expect, test } from "bun:test";
import {
  type LicenceSignals,
  commonsFileTitle,
  governingLicence,
  licenceSignals,
  plainText,
  readCommonsFile,
} from "./commons-image";
import missingFile from "./fixtures/commons-missing-file.json";
import morgan1878CC from "./fixtures/commons-1878-cc-morgan-dollar-nnc.json";
import morgan1893S from "./fixtures/commons-1893-s-morgan-dollar.json";
import morgan1899O from "./fixtures/commons-1899-o-morgan-dollar.json";
import morganSilverDollar from "./fixtures/commons-morgan-silver-dollar.json";
import ncFile from "./fixtures/commons-nc-edited.json";
import noLicence from "./fixtures/commons-no-licence-edited.json";

const signals = (overrides: Partial<LicenceSignals>): LicenceSignals => ({
  templates: [],
  categories: [],
  extmetadata: [],
  ...overrides,
});

/** An API answer for a JPEG file page with this wikitext and extmetadata. */
const commonsPage = (
  wikitext: string,
  extmetadata: Record<string, { value: string }> = {},
) => ({
  query: {
    pages: [
      {
        title: "File:Example.jpg",
        categories: [],
        revisions: [{ slots: { main: { content: wikitext } } }],
        imageinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg",
            descriptionurl:
              "https://commons.wikimedia.org/wiki/File:Example.jpg",
            size: 1000,
            mime: "image/jpeg",
            extmetadata,
          },
        ],
      },
    ],
  },
});

describe("governingLicence", () => {
  test("a CC photo licence governs over the design's PD template, whatever extmetadata says", () => {
    expect(governingLicence(licenceSignals(morgan1893S))).toEqual({
      accepted: true,
      licence: {
        name: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    });
  });

  test("a file whose only licences are PD is accepted under the Public Domain Mark", () => {
    expect(governingLicence(licenceSignals(morgan1878CC))).toEqual({
      accepted: true,
      licence: {
        name: "Public domain",
        url: "https://creativecommons.org/publicdomain/mark/1.0/",
      },
    });
  });

  test("a PD template that redirects is still read from its category", () => {
    expect(governingLicence(licenceSignals(morganSilverDollar))).toMatchObject({
      accepted: true,
      licence: { name: "Public domain" },
    });
  });

  test("of several versions of a CC licence, the newest governs", () => {
    // {{self|GFDL|cc-by-sa-all}}, in Category:CC-BY-SA-4.0,3.0,2.5,2.0,1.0
    expect(governingLicence(licenceSignals(morgan1899O))).toEqual({
      accepted: true,
      licence: {
        name: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    });
  });

  test("CC BY and CC0 photo licences are accepted with their deeds", () => {
    expect(
      governingLicence(signals({ templates: ["self", "cc-by-3.0-de"] })),
    ).toEqual({
      accepted: true,
      licence: {
        name: "CC BY 3.0 DE",
        url: "https://creativecommons.org/licenses/by/3.0/de/",
      },
    });
    expect(
      governingLicence(signals({ categories: ["CC-Zero", "PD US money"] })),
    ).toEqual({
      accepted: true,
      licence: {
        name: "CC0 1.0",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
      },
    });
  });

  test("a non-commercial licence is refused even beside a PD design template", () => {
    expect(governingLicence(licenceSignals(ncFile))).toEqual({
      accepted: false,
      reason: "nonCommercial",
    });
  });

  test("no-derivatives, non-free and disputed files are refused", () => {
    expect(governingLicence(signals({ categories: ["CC-BY-ND-4.0"] }))).toEqual(
      { accepted: false, reason: "noDerivatives" },
    );
    expect(governingLicence(signals({ templates: ["Non-free logo"] }))).toEqual(
      { accepted: false, reason: "nonFree" },
    );
    expect(
      governingLicence(
        signals({
          templates: ["No license since", "PD-USGov-money"],
          categories: ["Media without a license as of 12 October 2026"],
        }),
      ),
    ).toEqual({ accepted: false, reason: "disputed" });
  });

  test("a photo licence that isn't accepted is refused, not covered by the design's PD template", () => {
    expect(
      governingLicence(
        signals({
          templates: ["self", "GFDL", "PD-USGov-money"],
          categories: ["GFDL", "PD US money"],
        }),
      ),
    ).toEqual({ accepted: false, reason: "otherLicence" });
    // A licence not known by name counts too.
    expect(
      governingLicence(
        signals({
          templates: ["Licence Ouverte", "PD-USGov-money"],
          categories: ["Licence Ouverte", "PD US money"],
        }),
      ),
    ).toEqual({ accepted: false, reason: "otherLicence" });
  });

  test("files nominated for deletion or awaiting a source or permission are refused", () => {
    for (const tag of [
      "Deletion requests October 2026",
      "No source since",
      "Permission pending",
    ])
      expect(
        governingLicence(signals({ templates: [tag, "PD-USGov-money"] })),
      ).toEqual({ accepted: false, reason: "disputed" });
  });

  test("ported and IGO CC licences link their own deeds", () => {
    expect(
      governingLicence(signals({ categories: ["CC-BY-SA-3.0-IGO"] })),
    ).toEqual({
      accepted: true,
      licence: {
        name: "CC BY-SA 3.0 IGO",
        url: "https://creativecommons.org/licenses/by-sa/3.0/igo/",
      },
    });
  });

  test("text in the description isn't read as a licence", () => {
    const page = commonsPage(
      "{{Information|description={{en|Fair use? No: public domain coin}}|author=X}}\n{{self|cc-by-4.0}}",
    );
    expect(governingLicence(licenceSignals(page))).toEqual({
      accepted: true,
      licence: {
        name: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
      },
    });
    expect(
      governingLicence(licenceSignals(commonsPage("{{en|Public domain}}"))),
    ).toEqual({ accepted: false, reason: "none" });
  });

  test("a file with no licence found is refused", () => {
    expect(governingLicence(licenceSignals(noLicence))).toEqual({
      accepted: false,
      reason: "none",
    });
  });
});

describe("readCommonsFile", () => {
  test("fills the credit from the photo's licence and the creator, not extmetadata's Public domain", () => {
    expect(readCommonsFile(morgan1893S)).toEqual({
      file: {
        title: "File:1893-S Morgan dollar obverse.jpg",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/7/73/1893-S_Morgan_dollar_obverse.jpg",
        licence: {
          name: "CC BY-SA 4.0",
          url: "https://creativecommons.org/licenses/by-sa/4.0/",
        },
        credit: {
          source: "Wikimedia Commons",
          author: "Bruxton",
          licence:
            "CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); resized and converted to WebP",
          link: "https://commons.wikimedia.org/wiki/File:1893-S_Morgan_dollar_obverse.jpg",
        },
      },
    });
  });

  test("credits the creator of a public-domain file too", () => {
    expect(readCommonsFile(morgan1878CC)).toMatchObject({
      file: {
        credit: {
          source: "Wikimedia Commons",
          author:
            "US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash)",
          licence:
            "Public domain (https://creativecommons.org/publicdomain/mark/1.0/); resized and converted to WebP",
          link: "https://commons.wikimedia.org/wiki/File:NNC-US-1878-CC-1$-Morgan_dollar.jpg",
        },
      },
    });
  });

  test("credits the author as the licence's attribution asks, when it does", () => {
    const page = commonsPage("{{self|cc-by-sa-4.0|attribution=Jane Doe}}", {
      Artist: {
        value: '<a href="//commons.wikimedia.org/wiki/User:JD">JD</a>',
      },
      Attribution: { value: "Jane Doe" },
    });
    expect(readCommonsFile(page)).toMatchObject({
      file: { credit: { author: "Jane Doe" } },
    });
  });

  test("leaves the author empty when the file page names no creator", () => {
    expect(readCommonsFile(morganSilverDollar)).toMatchObject({
      file: { credit: { author: "" } },
    });
  });

  test("refuses a file whose licence isn't accepted", () => {
    expect(readCommonsFile(ncFile)).toEqual({ problem: "nonCommercial" });
    expect(readCommonsFile(noLicence)).toEqual({ problem: "none" });
  });

  test("reports a file that doesn't exist", () => {
    expect(readCommonsFile(missingFile)).toEqual({ problem: "notFound" });
    expect(readCommonsFile({ error: { code: "invalidtitle" } })).toEqual({
      problem: "notFound",
    });
  });
});

describe("commonsFileTitle", () => {
  test("reads the file's title from a Commons address", () => {
    const title = "File:1893-S Morgan dollar obverse.jpg";
    for (const address of [
      "https://commons.wikimedia.org/wiki/File:1893-S_Morgan_dollar_obverse.jpg",
      "  https://commons.m.wikimedia.org/wiki/File:1893-S_Morgan_dollar_obverse.jpg?uselang=de  ",
      "https://commons.wikimedia.org/w/index.php?title=File:1893-S_Morgan_dollar_obverse.jpg&oldid=1",
      "https://commons.wikimedia.org/wiki/Category:Morgan_dollar#/media/File:1893-S_Morgan_dollar_obverse.jpg",
      "https://commons.wikimedia.org/wiki/Image:1893-S_Morgan_dollar_obverse.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/7/73/1893-S_Morgan_dollar_obverse.jpg",
    ])
      expect(commonsFileTitle(address)).toBe(title);
    expect(
      commonsFileTitle(
        "https://commons.wikimedia.org/wiki/File:NNC-US-1878-CC-1%24-Morgan_dollar.jpg",
      ),
    ).toBe("File:NNC-US-1878-CC-1$-Morgan dollar.jpg");
  });

  test("refuses anything but a Commons file", () => {
    for (const address of [
      "",
      "1893-S Morgan dollar obverse.jpg",
      "https://commons.wikimedia.org/wiki/Category:Morgan_dollar",
      "https://en.wikipedia.org/wiki/File:Some_fair_use_logo.png",
      "https://upload.wikimedia.org/wikipedia/en/7/73/Some_fair_use_logo.png",
      "https://commons.wikimedia.org.example.com/wiki/File:X.jpg",
      "https://commons.wikimedia.org/wiki/File:",
    ])
      expect(commonsFileTitle(address)).toBeUndefined();
  });
});

describe("plainText", () => {
  test("strips tags and hidden text and decodes entities", () => {
    expect(
      plainText(
        '<a href="//commons.wikimedia.org/wiki/User:X" title="User:X">Jane &amp; John</a>&nbsp;<span style="display: none;">Unknown author</span>',
      ),
    ).toBe("Jane & John");
    expect(plainText("<bdi>Smith, &#8220;Ann&#x201D;</bdi>\n (photo)")).toBe(
      "Smith, “Ann” (photo)",
    );
  });
});
