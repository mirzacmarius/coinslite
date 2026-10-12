import { describe, expect, test } from "bun:test";
import { englishFallbacks, keyedTexts } from "./index";

describe("keyedTexts", () => {
  test("lists every text of a nested message object by its path", () => {
    expect(
      keyedTexts({
        title: "Report",
        notes: { owner: "Stated by the owner" },
        highlights: ["One", "Two"],
      }),
    ).toEqual([
      ["title", "Report"],
      ["notes.owner", "Stated by the owner"],
      ["highlights.0", "One"],
      ["highlights.1", "Two"],
    ]);
  });

  test("writes out a message that takes values with numbered stand-ins", () => {
    expect(
      keyedTexts({
        page: (page: number, pages: number) => `Page ${page} of ${pages}`,
      }),
    ).toEqual([["page", "Page ⟨1⟩ of ⟨2⟩"]]);
  });
});

describe("englishFallbacks", () => {
  const english = [
    ["save", "Save"],
    ["plan", "Premium"],
    ["material", "Material"],
    ["range", "{from}–{to}"],
    ["title", "Title"],
  ] as const;

  test("finds the texts a language left in English", () => {
    expect(
      englishFallbacks("fr", english, [
        ["save", "Save"],
        ["plan", "Premium"],
        ["material", "Métal"],
        ["range", "{from}–{to}"],
        ["title", "Titre"],
      ]),
    ).toEqual([["save", "Save"]]);
  });

  test("accepts a word only in the languages that share it with English", () => {
    const material = [["material", "Material"]] as const;
    expect(englishFallbacks("de", english, material)).toEqual([]);
    expect(englishFallbacks("fr", english, material)).toEqual([
      ["material", "Material"],
    ]);
  });

  test("a translation that differs from English is never a fallback", () => {
    expect(englishFallbacks("nb", english, [["save", "Lagre"]])).toEqual([]);
  });
});
