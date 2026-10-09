import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import { describe, expect, test } from "vitest";
import { factValues, formArgs, valuesFromItem } from "./item-form";

/** A stored Item, as the Item page reads it. */
const morgan: Doc<"items"> = {
  _id: "items-1" as Id<"items">,
  _creationTime: 0,
  ownerId: "users-1" as Id<"users">,
  type: "coin",
  title: "Morgan dollar 1881-S",
  notes: "From my grandfather",
  country: "US",
  year: 1881,
  denomination: "One dollar",
  mintMark: "S",
  mintage: 12_760_000,
  diameter: 38.13,
  metal: "silver",
  weight: 26.73,
  purity: 0.9,
  grade: "65",
  gradingScale: "sheldon",
  strike: "proof",
  quantity: 2,
  purchasePrice: 123_450,
  purchaseDate: "2024-05-01",
  source: "Coin fair",
  albumId: "albums-1" as Id<"albums">,
};

describe("a duplicate (spec 5.5) sends what the original holds", () => {
  test("every field of an Item typed in by hand, in any language", () => {
    for (const locale of ["en", "nb"] as const) {
      expect(
        formArgs(valuesFromItem(morgan, locale), undefined, locale),
      ).toMatchObject({
        type: "coin",
        title: "Morgan dollar 1881-S",
        notes: "From my grandfather",
        country: "US",
        year: 1881,
        denomination: "One dollar",
        mintMark: "S",
        mintage: 12_760_000,
        diameter: 38.13,
        metal: "silver",
        weight: 26.73,
        purity: 0.9,
        grade: "65",
        gradingScale: "sheldon",
        strike: "proof",
        quantity: 2,
        purchasePrice: 123_450,
        purchaseDate: "2024-05-01",
        source: "Coin fair",
        albumId: "albums-1",
      });
    }
  });

  test("only the facts changed from its Catalog entry, for a linked Item", () => {
    const entry = factValues(
      {
        country: "US",
        year: 1881,
        denomination: "1 dollar",
        diameter: 38.13,
        metal: "silver",
        weight: 26.73,
        purity: 0.9,
      },
      "nb",
    );

    const args = formArgs(valuesFromItem(morgan, "nb"), entry, "nb");

    expect(args).toMatchObject({
      title: "Morgan dollar 1881-S",
      denomination: "One dollar",
      mintMark: "S",
      quantity: 2,
      purchasePrice: 123_450,
    });
    for (const fact of [
      "country",
      "year",
      "diameter",
      "metal",
      "weight",
      "purity",
    ] as const) {
      expect(args[fact]).toBeUndefined();
    }
  });
});
