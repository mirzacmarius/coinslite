/**
 * Whether what someone typed is the word a confirmation asks for, such as
 * DELETE before deleting the account: spaces around it, letter case and
 * accents aside, so "Loschen" confirms LÖSCHEN and "sterge" ȘTERGE on a
 * keyboard without those letters.
 */
export function typedWord(typed: string, word: string): boolean {
  const plain = (text: string) =>
    text.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return plain(word) !== "" && plain(typed) === plain(word);
}
