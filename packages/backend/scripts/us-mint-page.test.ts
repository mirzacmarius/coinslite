import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseCoinPage } from "./us-mint-page";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("a saved US Mint coin page", () => {
  test("gives the Delaware quarter's design, release date, mints and artists", () => {
    const page = parseCoinPage(fixture("usmint-delaware-quarter.html"));

    expect(page.title).toBe("Delaware State Quarter");
    expect(page.year).toBe(1999);
    expect(page.releaseDate).toBe("1999-01-04");
    expect(page.design).toBe(
      "The obverse (heads) design features the familiar image of George Washington by John Flanagan, used on the quarter since 1932. The reverse (tails) design shows Caesar Rodney's historic horseback ride in 1776 to cast his vote in favor of Delaware signing the Declaration of Independence.",
    );
    expect(page.mints).toEqual(["Denver", "Philadelphia"]);
    expect(page.artists).toEqual([
      { name: "John Flanagan", role: "Obverse Designer" },
      { name: "William Cousins", role: "Sculptor & Reverse Designer" },
    ]);
    expect(page.edgeInscriptions).toEqual([]);
  });

  test("reads a dollar's edge inscriptions and takes no other date for its release", () => {
    const page = parseCoinPage(fixture("usmint-george-washington-dollar.html"));

    expect(page.title).toBe("George Washington Presidential $1 Coin");
    expect(page.year).toBe(2007);
    // The page dates Washington's first Act of Congress, not the coin's release.
    expect(page.releaseDate).toBeUndefined();
    expect(page.design).toBe(
      "The obverse (heads) shows a portrait of George Washington. The reverse (tails) features a striking rendition of the Statue of Liberty.",
    );
    expect(page.mints).toEqual(["Denver", "Philadelphia", "San Francisco"]);
    expect(page.edgeInscriptions).toEqual([
      "2007",
      "E PLURIBUS UNUM",
      "IN GOD WE TRUST",
      'Mint mark ("P", "D," or "S")',
    ]);
    expect(page.artists).toEqual([
      { name: "Joseph Menna", role: "Obverse Designer & Sculptor" },
      { name: "Don Everhart", role: "Reverse Designer & Sculptor" },
    ]);
  });

  test("takes the year from the background where the page leaves out the year of issue", () => {
    const page = parseCoinPage(
      `<h1 class="cmp-title__text ">Arches National Park Quarter</h1>
      <h2 class="cmp-title__text ">Background</h2>
      <p>The 2014 Arches National Park Quarter is the 23rd coin in the America the Beautiful Quarters® Program.</p>
      <h2 class="cmp-title__text ">Characteristics</h2>
      <p>The reverse (tails) depicts Delicate Arch.</p>`,
    );

    expect(page.year).toBe(2014);
  });

  test("reads the Mint's former page layout, with artists listed by side", () => {
    const page = parseCoinPage(fixture("usmint-maya-angelou-quarter.html"));

    expect(page.title).toBe("Maya Angelou Quarter");
    expect(page.year).toBe(2022);
    expect(page.releaseDate).toBeUndefined();
    expect(page.design).toStartWith(
      "The obverse (heads) depicts a portrait of George Washington, originally composed and sculpted by Laura Gardin Fraser",
    );
    expect(page.design).toEndWith(
      "images inspired by her poetry and symbolic of the way she lived.",
    );
    expect(page.mints).toEqual(["Denver", "Philadelphia"]);
    expect(page.artists).toEqual([
      // The page names her under the obverse without a role.
      { name: "Laura Gardin Fraser", role: "Obverse" },
      { name: "Craig Campbell", role: "Reverse Sculptor" },
      { name: "Emily Damstra", role: "Reverse Designer" },
    ]);
  });
});
