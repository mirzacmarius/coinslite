import { describe, expect, test } from "bun:test";
import { itemLimits } from "../items/rules";
import {
  afterBatch,
  afterStall,
  convertBatch,
  tooLargeForOneGo,
} from "./rules";

/** A batch's outcome; by default it found an amount and every one fits. */
const batch = (
  outcome: Partial<{
    isDone: boolean;
    continueCursor: string;
    tooLarge: boolean;
    anyAmount: boolean;
  }>,
) => ({
  isDone: false,
  continueCursor: "next",
  tooLarge: false,
  anyAmount: true,
  ...outcome,
});

describe("afterBatch", () => {
  test("checking continues from where the batch stopped while Items are left", () => {
    expect(
      afterBatch(
        { phase: "checking", cursor: null, anyAmount: false },
        batch({ continueCursor: "c1", anyAmount: false }),
      ),
    ).toEqual({
      step: "continue",
      progress: { phase: "checking", cursor: "c1", anyAmount: false },
    });
  });

  test("checking remembers an amount was found", () => {
    expect(
      afterBatch(
        { phase: "checking", cursor: "c1", anyAmount: false },
        batch({ continueCursor: "c2", anyAmount: true }),
      ),
    ).toEqual({
      step: "continue",
      progress: { phase: "checking", cursor: "c2", anyAmount: true },
    });
  });

  test("once every Item is checked, converting starts from the first", () => {
    expect(
      afterBatch(
        { phase: "checking", cursor: "c7", anyAmount: true },
        batch({ isDone: true, anyAmount: false }),
      ),
    ).toEqual({
      step: "continue",
      progress: { phase: "converting", cursor: null, anyAmount: true },
    });
  });

  test("once every Item is checked and none had an amount, the change finishes without converting", () => {
    expect(
      afterBatch(
        { phase: "checking", cursor: "c7", anyAmount: false },
        batch({ isDone: true, anyAmount: false }),
      ),
    ).toEqual({ step: "finish" });
  });

  test("converting continues from where the batch stopped while Items are left", () => {
    expect(
      afterBatch(
        { phase: "converting", cursor: null, anyAmount: true },
        batch({ continueCursor: "c1" }),
      ),
    ).toEqual({
      step: "continue",
      progress: { phase: "converting", cursor: "c1", anyAmount: true },
    });
  });

  test("once every Item is converted, the change finishes", () => {
    expect(
      afterBatch(
        { phase: "converting", cursor: "c7", anyAmount: true },
        batch({ isDone: true }),
      ),
    ).toEqual({ step: "finish" });
  });

  test("an amount too large for the new currency, found while checking, calls the change off", () => {
    expect(
      afterBatch(
        { phase: "checking", cursor: "c3", anyAmount: true },
        batch({ continueCursor: "c4", tooLarge: true }),
      ),
    ).toEqual({ step: "cancel" });
  });

  test("converting never stops halfway, once every amount was checked", () => {
    expect(
      afterBatch(
        { phase: "converting", cursor: "c3", anyAmount: true },
        batch({ continueCursor: "c4", tooLarge: true }),
      ),
    ).toEqual({
      step: "continue",
      progress: { phase: "converting", cursor: "c4", anyAmount: true },
    });
  });
});

describe("afterStall", () => {
  test("a change that stopped is retried up to three times", () => {
    expect(afterStall({ phase: "converting", retries: 2 })).toEqual({
      step: "retry",
    });
  });

  test("still stopped while checking after three retries, it's called off: nothing is converted yet", () => {
    expect(afterStall({ phase: "checking", retries: 3 })).toEqual({
      step: "cancel",
    });
  });

  test("still stopped while converting after three retries, it waits for the person to try again", () => {
    expect(afterStall({ phase: "converting", retries: 3 })).toEqual({
      step: "wait",
    });
  });
});

describe("convertBatch", () => {
  test("converts each amount on an Item at the rate, rounded to whole minor units", () => {
    const converted = convertBatch(
      {
        items: [{ _id: "a", purchasePrice: 1250, marketValue: 1999 }],
        history: [],
      },
      11.4721,
      "EUR",
    );
    expect(converted.items).toEqual([
      { _id: "a", amounts: { purchasePrice: 14340, marketValue: 22933 } },
    ]);
  });

  test("converts only the fields that hold an amount, and passes over Items with none", () => {
    const converted = convertBatch(
      {
        items: [{ _id: "none" }, { _id: "sold", salePrice: 80000 }],
        history: [],
      },
      0.0861,
      "EUR",
    );
    expect(converted.items).toEqual([
      { _id: "sold", amounts: { salePrice: 6888 } },
    ]);
  });

  test("converts each history point's Market value, passing over points without one", () => {
    const converted = convertBatch(
      {
        items: [],
        history: [{ _id: "p1", marketValue: 4999 }, { _id: "p2" }],
      },
      1.1612,
      "EUR",
    );
    expect(converted.history).toEqual([{ _id: "p1", marketValue: 5805 }]);
  });

  test("an amount up to a hundred billion in the new currency fits", () => {
    const converted = convertBatch(
      {
        items: [{ _id: "a", marketValue: 1_000_000_000_000 }],
        history: [{ _id: "p", marketValue: 1_000_000_000_000 }],
      },
      10,
      "EUR",
    );
    expect(converted.tooLarge).toBe(false);
  });

  test("an Item's amount past a hundred billion in the new currency is too large", () => {
    const converted = convertBatch(
      { items: [{ _id: "a", purchasePrice: 1_000_000_000_001 }], history: [] },
      10,
      "EUR",
    );
    expect(converted.tooLarge).toBe(true);
  });

  test("a history point's Market value past a hundred billion in the new currency is too large", () => {
    const converted = convertBatch(
      { items: [], history: [{ _id: "p", marketValue: 1_000_000_000_001 }] },
      10,
      "EUR",
    );
    expect(converted.tooLarge).toBe(true);
  });

  test("an Item paid in the new currency takes the amount it was paid", () => {
    const paid = {
      amount: 12000,
      currency: "EUR" as const,
      rateDay: "2024-05-10",
    };
    const converted = convertBatch(
      {
        items: [
          {
            _id: "euro",
            purchasePrice: 138_050,
            purchasePaid: paid,
            marketValue: 150_000,
          },
          {
            _id: "pound",
            purchasePrice: 160_000,
            purchasePaid: { ...paid, currency: "GBP" },
          },
        ],
        history: [],
      },
      0.0861,
      "EUR",
    );
    expect(converted.items).toEqual([
      { _id: "euro", amounts: { purchasePrice: 12000, marketValue: 12915 } },
      // Paid in pounds: converted at the change's rate, it keeps what was
      // paid, without the day of the ECB rates it no longer comes from.
      {
        _id: "pound",
        amounts: { purchasePrice: 13776 },
        purchasePaid: { amount: 12000, currency: "GBP" },
      },
    ]);
    expect(converted.tooLarge).toBe(false);
    // What was paid goes past the largest amount an Item holds.
    const tooMuch = { ...paid, amount: itemLimits.amount + 1 };
    expect(
      convertBatch(
        {
          items: [{ _id: "euro", purchasePrice: 1, purchasePaid: tooMuch }],
          history: [],
        },
        0.0861,
        "EUR",
      ).tooLarge,
    ).toBe(true);
  });
});

/** History points as read: `valued` with a Market value, then `unvalued` without one. */
const points = (valued: number, unvalued: number) => [
  ...Array.from({ length: valued }, () => ({ marketValue: 1250 })),
  ...Array.from({ length: unvalued }, () => ({})),
];

/** Items as read; the rule only counts them. */
const items = (count: number) => Array.from({ length: count }, () => ({}));

describe("tooLargeForOneGo", () => {
  test("history read past 5,000 points is converted in the background, though some have no Market value", () => {
    expect(tooLargeForOneGo({ items: [], history: points(5000, 1) })).toBe(
      true,
    );
  });

  test("history read past 5,000 points is converted in the background when none has a Market value", () => {
    expect(tooLargeForOneGo({ items: [], history: points(0, 5001) })).toBe(
      true,
    );
  });

  test("5,000 Items and 5,000 history points convert in one go, with or without Market values", () => {
    expect(
      tooLargeForOneGo({ items: items(5000), history: points(4000, 1000) }),
    ).toBe(false);
  });

  test("Items read past 5,000 are converted in the background", () => {
    expect(tooLargeForOneGo({ items: items(5001), history: [] })).toBe(true);
  });
});
