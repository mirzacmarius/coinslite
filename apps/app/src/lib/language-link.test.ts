import { expect, test } from "vitest";
import { languageFromLink } from "./language-link";

const link = (url: string) => languageFromLink(new URL(url));

test("a link carrying a language opens the page in it, without the parameter", () => {
  expect(link("https://app.example/signup?lang=de")).toEqual({
    locale: "de",
    path: "/signup",
  });
  expect(link("https://app.example/login?next=%2Fcatalog&lang=nb")).toEqual({
    locale: "nb",
    path: "/login?next=%2Fcatalog",
  });
});

test("a language the app doesn't have is dropped from the address", () => {
  expect(link("https://app.example/signup?lang=es")).toEqual({
    locale: undefined,
    path: "/signup",
  });
});

test("a link without a language is left alone", () => {
  expect(link("https://app.example/signup")).toBeNull();
  expect(link("https://app.example/collection?q=krone")).toBeNull();
});
