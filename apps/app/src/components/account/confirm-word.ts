/**
 * Whether what someone typed is the word a confirmation asks for, such as
 * DELETE before deleting the account: spaces around it, letter case and
 * accents aside, so "loschen" or "Loeschen" confirms LÖSCHEN and "sterge"
 * ȘTERGE on a keyboard without those letters.
 */
export function typedWord(typed: string, word: string): boolean {
  const lower = (text: string) => text.trim().normalize("NFC").toLowerCase();
  const unaccented = (text: string) =>
    lower(text).normalize("NFD").replace(/\p{M}/gu, "");
  // German's own way of writing its umlauts without them.
  const spelledOut = (text: string) =>
    unaccented(
      lower(text)
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss"),
    );
  return (
    unaccented(word) !== "" &&
    (unaccented(typed) === unaccented(word) ||
      spelledOut(typed) === spelledOut(word))
  );
}
