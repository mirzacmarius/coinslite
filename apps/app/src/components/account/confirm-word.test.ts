import { describe, expect, test } from "bun:test";
import { typedWord } from "./confirm-word";

describe("typedWord", () => {
  test("the word as shown confirms", () => {
    expect(typedWord("DELETE", "DELETE")).toBe(true);
  });

  test("letter case and spaces around it don't matter", () => {
    expect(typedWord("delete", "DELETE")).toBe(true);
    expect(typedWord(" Delete ", "DELETE")).toBe(true);
  });

  test("accents don't matter, for keyboards without those letters", () => {
    expect(typedWord("loschen", "LÖSCHEN")).toBe(true);
    expect(typedWord("LOESCHEN", "LÖSCHEN")).toBe(true);
    expect(typedWord("sterge", "ȘTERGE")).toBe(true);
    // The cedilla Ş that older Romanian keyboards type.
    expect(typedWord("ŞTERGE", "ȘTERGE")).toBe(true);
  });

  test("anything else doesn't", () => {
    expect(typedWord("", "DELETE")).toBe(false);
    expect(typedWord("DELET", "DELETE")).toBe(false);
    expect(typedWord("DELETE ME", "DELETE")).toBe(false);
    expect(typedWord("CANCEL", "DELETE")).toBe(false);
    expect(typedWord("LOSHEN", "LÖSCHEN")).toBe(false);
  });
});
