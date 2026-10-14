import { describe, expect, test } from "bun:test";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import { FieldApi, FormApi } from "@tanstack/react-form";
import {
  blankItem,
  factValues,
  fillForm,
  prefillForm,
  valuesFromItem,
} from "./item-form";
import { formArgs } from "./item-form-submit";

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

describe("filling the form from a Catalog entry (MUS-734)", () => {
  /** A form with only the always-visible fields mounted, like a closed "More details". */
  const formWithTitleMounted = () => {
    const form = new FormApi({ defaultValues: blankItem() });
    form.mount();
    new FieldApi({ form, name: "title" }).mount();
    return form;
  };

  test("a fact filled while its field is hidden still validates once the field shows", async () => {
    const form = formWithTitleMounted();
    fillForm(form, { title: "Morgan dollar 1881-S", year: "1881" });
    // "More details" opens: the year field mounts.
    new FieldApi({ form, name: "year" }).mount();
    await expect(form.validateAllFields("submit")).resolves.toBeDefined();
    expect(form.getFieldValue("year")).toBe("1881");
  });

  test("a filled visible field counts as input, so the unsaved-input guard holds", () => {
    const form = formWithTitleMounted();
    fillForm(form, { title: "Morgan dollar 1881-S", year: "1881" });
    expect(form.state.isDirty).toBe(true);
  });
});

describe("filling pills in for the person", () => {
  test("a prefilled pill holds its value but isn't input to keep or discard", () => {
    const form = new FormApi({ defaultValues: blankItem() });
    form.mount();
    new FieldApi({ form, name: "country" }).mount();
    prefillForm(form, { type: "banknote", country: "NO" });
    expect(form.getFieldValue("country")).toBe("NO");
    expect(form.getFieldValue("type")).toBe("banknote");
    expect(form.state.isDirty).toBe(false);
  });
});
