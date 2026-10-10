import { expect, test } from "vitest";
import { languageRedirect } from "./routing";

const visit = (
  pathname: string,
  { stored, acceptLanguage }: { stored?: string; acceptLanguage?: string } = {},
) => languageRedirect({ pathname, stored, acceptLanguage });

test("a page in a language is served as it is", () => {
  expect(visit("/de")).toBeNull();
  expect(visit("/nb/privacy")).toBeNull();
  expect(visit("/ro/terms", { stored: "fr" })).toBeNull();
});

test("a page without a language opens in the stored choice first", () => {
  expect(visit("/", { stored: "ro", acceptLanguage: "de-DE,de" })).toBe("/ro");
  expect(visit("/privacy", { stored: "nb" })).toBe("/nb/privacy");
});

test("without a stored choice, the browser's language decides, else English", () => {
  expect(visit("/terms", { acceptLanguage: "fr-CA,fr;q=0.9" })).toBe(
    "/fr/terms",
  );
  expect(visit("/", { acceptLanguage: "nn-NO" })).toBe("/nb");
  expect(visit("/privacy", { acceptLanguage: "es-ES" })).toBe("/en/privacy");
  expect(visit("/")).toBe("/en");
});

test("a stored value that isn't a language is ignored", () => {
  expect(visit("/", { stored: "xx", acceptLanguage: "de" })).toBe("/de");
});

test("an unknown first segment is kept, so the page says it doesn't exist", () => {
  expect(visit("/es/privacy", { acceptLanguage: "de" })).toBe("/de/es/privacy");
  expect(visit("/english")).toBe("/en/english");
});
