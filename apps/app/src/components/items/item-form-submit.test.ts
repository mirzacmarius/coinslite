import { describe, expect, test } from "bun:test";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { blankItem } from "./item-form";
import { itemFormRules, itemSave, refusedDetails } from "./item-form-submit";

/** A coin typed in by hand. */
const typed = {
  ...blankItem(),
  title: "Morgan dollar 1881-S",
  country: "US" as const,
  year: "1881",
  denomination: "One dollar",
  purchasePrice: "1234,50",
  albumId: "albums-1" as Id<"albums">,
};

/** The Catalog entry the typed coin matches. */
const morganEntry = {
  key: "us-morgan-dollar-1881-s",
  title: "1 dollar 1881-S Morgan",
  facts: { country: "US", year: 1881, denomination: "1 dollar" },
};

describe("saving a new Item", () => {
  test("adds it with what the form holds, in the currency it was typed in", () => {
    const { save, wanted } = itemSave({
      values: typed,
      linked: undefined,
      catalogVisible: true,
      albumIds: ["albums-1"],
      wantedKeys: undefined,
      amountsIn: "NOK",
      locale: "nb",
    });

    expect(save.mutation).toBe("add");
    expect(save.args).toMatchObject({
      type: "coin",
      title: "Morgan dollar 1881-S",
      country: "US",
      year: 1881,
      denomination: "One dollar",
      purchasePrice: 123_450,
      albumId: "albums-1",
      amountsIn: "NOK",
    });
    expect(save.args).not.toHaveProperty("catalogEntryKey");
    expect(wanted).toBe(false);
  });
});

describe("saving an Item linked to a Catalog entry", () => {
  test("a new one is added linked, with only the facts changed from the entry", () => {
    const { save } = itemSave({
      values: typed,
      linked: morganEntry,
      catalogVisible: true,
      albumIds: undefined,
      wantedKeys: undefined,
      amountsIn: "NOK",
      locale: "nb",
    });

    expect(save.mutation).toBe("add");
    expect(save.args).toMatchObject({
      catalogEntryKey: "us-morgan-dollar-1881-s",
      denomination: "One dollar",
    });
    expect(save.args.country).toBeUndefined();
    expect(save.args.year).toBeUndefined();
  });

  test("adding from a wanted entry clears the want", () => {
    const wantedWith = (wantedKeys: Set<string>) =>
      itemSave({
        values: typed,
        linked: morganEntry,
        catalogVisible: true,
        albumIds: undefined,
        wantedKeys,
        amountsIn: "NOK",
        locale: "nb",
      }).wanted;

    expect(wantedWith(new Set(["us-morgan-dollar-1881-s"]))).toBe(true);
    expect(wantedWith(new Set(["us-peace-dollar-1922"]))).toBe(false);
  });

  test("a copy made while the Catalog is hidden becomes the person's own", () => {
    const { save, wanted } = itemSave({
      values: typed,
      linked: morganEntry,
      catalogVisible: false,
      albumIds: undefined,
      wantedKeys: new Set(["us-morgan-dollar-1881-s"]),
      amountsIn: "NOK",
      locale: "nb",
    });

    expect(save.args).not.toHaveProperty("catalogEntryKey");
    expect(save.args).toMatchObject({ country: "US", year: 1881 });
    expect(wanted).toBe(false);
  });
});

describe("saving an Item being edited", () => {
  test("updates it, keeping its link even while the Catalog is hidden", () => {
    const { save, wanted } = itemSave({
      values: typed,
      itemId: "items-1" as Id<"items">,
      linked: morganEntry,
      storedLinkKey: morganEntry.key,
      catalogVisible: false,
      albumIds: undefined,
      wantedKeys: new Set(["us-morgan-dollar-1881-s"]),
      amountsIn: "EUR",
      locale: "nb",
    });

    expect(save.mutation).toBe("update");
    expect(save.args).toMatchObject({
      itemId: "items-1",
      denomination: "One dollar",
      amountsIn: "EUR",
    });
    expect(save.args).not.toHaveProperty("catalogEntryKey");
    expect(save.args.country).toBeUndefined();
    expect(wanted).toBe(false);
  });

  test("links it to the entry picked while editing, in place of its own", () => {
    const { save } = itemSave({
      values: typed,
      itemId: "items-1" as Id<"items">,
      linked: morganEntry,
      storedLinkKey: "us-peace-dollar-1922",
      catalogVisible: true,
      albumIds: undefined,
      wantedKeys: undefined,
      amountsIn: "EUR",
      locale: "nb",
    });

    expect(save.args).toMatchObject({
      catalogEntryKey: "us-morgan-dollar-1881-s",
    });
  });

  test("links an Item added by hand to the entry picked while editing, clearing its want", () => {
    const { save, wanted } = itemSave({
      values: typed,
      itemId: "items-1" as Id<"items">,
      linked: morganEntry,
      catalogVisible: true,
      albumIds: undefined,
      wantedKeys: new Set(["us-morgan-dollar-1881-s"]),
      amountsIn: "EUR",
      locale: "nb",
    });

    expect(save.args).toMatchObject({
      catalogEntryKey: "us-morgan-dollar-1881-s",
    });
    expect(wanted).toBe(true);
  });
});

describe("the Album a new Item is filed into", () => {
  const albumWith = (albumIds: string[] | undefined): string | undefined =>
    itemSave({
      values: typed,
      linked: undefined,
      catalogVisible: true,
      albumIds,
      wantedKeys: undefined,
      amountsIn: "NOK",
      locale: "nb",
    }).save.args.albumId;

  test("is the one picked", () => {
    expect(albumWith(["albums-2", "albums-1"])).toBe("albums-1");
  });

  test("is none when it was deleted since the form opened", () => {
    expect(albumWith(["albums-2"])).toBeUndefined();
  });

  test("stays while the Albums load", () => {
    expect(albumWith(undefined)).toBe("albums-1");
  });
});

describe("what the Item form accepts", () => {
  // Each message as its translation key, to tell which rule spoke.
  const rules = itemFormRules((key) => key, "nb");
  const errorOf = (rule: keyof typeof rules, text: string) => {
    const result = rules[rule].safeParse(text);
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  test("a title, which can't be left blank", () => {
    expect(errorOf("title", "Morgan dollar")).toBeUndefined();
    expect(errorOf("title", "   ")).toBe("items.errors.titleRequired");
  });

  test("a quantity of at least one, as a whole number", () => {
    expect(errorOf("quantity", "2")).toBeUndefined();
    expect(errorOf("quantity", "0")).toBe("items.errors.quantity");
    expect(errorOf("quantity", "1.5")).toBe("items.errors.quantity");
  });

  test("a year of up to four digits, before the common era too", () => {
    expect(errorOf("year", "1881")).toBeUndefined();
    expect(errorOf("year", "-450")).toBeUndefined();
    expect(errorOf("year", "")).toBeUndefined();
    expect(errorOf("year", "18810")).toBe("items.errors.year");
  });

  test("an amount as the person's language writes it", () => {
    expect(errorOf("money", "1 234,50")).toBeUndefined();
    expect(errorOf("money", "a lot")).toBe("items.errors.amount");
  });

  test("a mintage with digit grouping, of at least one", () => {
    expect(errorOf("whole", "12 760 000")).toBeUndefined();
    expect(errorOf("whole", "0")).toBe("items.errors.wholeNumber");
  });

  test("a size above zero, with either decimal mark", () => {
    expect(errorOf("size", "38,1")).toBeUndefined();
    expect(errorOf("size", "0")).toBe("items.errors.number");
  });

  test("a weight and purity within what a coin can hold", () => {
    expect(errorOf("weight", "31,1")).toBeUndefined();
    expect(errorOf("weight", "0")).toBe("preciousMetal.errors.weight");
    expect(errorOf("purity", "0,999")).toBeUndefined();
    expect(errorOf("purity", "1,5")).toBe("preciousMetal.errors.purity");
  });

  test("a purchase date no later than today", () => {
    expect(errorOf("purchaseDate", "2024-05-01")).toBeUndefined();
    expect(errorOf("purchaseDate", "")).toBeUndefined();
    expect(errorOf("purchaseDate", "2999-01-01")).toBe("items.errors.date");
  });
});

describe('what "More details" holds that its rules refuse', () => {
  const rules = itemFormRules((key) => key, "nb");

  test("nothing, when every detail is fine or left blank", () => {
    expect(refusedDetails(typed, rules)).toEqual([]);
  });

  test("each detail its rule refuses, in the order they show", () => {
    expect(
      refusedDetails(
        {
          ...typed,
          year: "18810",
          diameter: "0",
          purchasePrice: "a lot",
          purchaseDate: "2999-01-01",
        },
        rules,
      ),
    ).toEqual(["year", "diameter", "purchasePrice", "purchaseDate"]);
  });

  test("a weight and purity beyond what a coin can hold", () => {
    expect(
      refusedDetails({ ...typed, weight: "0", purity: "1,5" }, rules),
    ).toEqual(["weight", "purity"]);
  });
});
