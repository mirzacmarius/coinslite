import { describe, expect, test } from "bun:test";
import { planDeletionBatch, planRetypeBatch } from "./changeRules";

describe("one batch of giving a Catalog entry's Items its new Item type", () => {
  test("retypes the Items read, dropping what a banknote has no place for, and passes over those already retyped", () => {
    expect(
      planRetypeBatch(
        [
          {
            _id: "silver-coin",
            _creationTime: 100,
            type: "coin",
            metal: "silver",
            weight: 26.73,
            purity: 0.9,
            mintage: 12760000,
            grader: "PCGS",
          },
          { _id: "added-since", _creationTime: 200, type: "banknote" },
        ],
        { type: "banknote", budget: 500 },
      ),
    ).toEqual({
      retype: [
        {
          id: "silver-coin",
          fields: {
            type: "banknote",
            metal: undefined,
            weight: undefined,
            purity: undefined,
          },
        },
      ],
      after: 200,
      done: true,
    });
  });

  test("with more Items than a batch takes, goes on from the last one it read", () => {
    const items = [1, 2, 3].map((n) => ({
      _id: `item-${n}`,
      _creationTime: n * 10,
      type: "coin" as const,
    }));
    expect(planRetypeBatch(items, { type: "stamp", budget: 2 })).toEqual({
      retype: [
        { id: "item-1", fields: { type: "stamp" } },
        { id: "item-2", fields: { type: "stamp" } },
      ],
      after: 20,
      done: false,
    });
  });
});

describe("one batch of deleting Catalog nodes", () => {
  test("a small subtree goes in one batch, each entry's Items and wants before the entry", () => {
    expect(
      planDeletionBatch(
        [
          { id: "entry-1918", linkedItems: 3, wants: 1 },
          { id: "entry-1919", linkedItems: 0, wants: 0 },
          { id: "grouping-2-ore", linkedItems: 0, wants: 0 },
        ],
        { complete: true, budget: 500 },
      ),
    ).toEqual({
      steps: [
        { id: "entry-1918", detach: 3, clearWants: 1, remove: true },
        { id: "entry-1919", detach: 0, clearWants: 0, remove: true },
        { id: "grouping-2-ore", detach: 0, clearWants: 0, remove: true },
      ],
      done: true,
    });
  });

  test("an entry 3,000 Items link to goes after its Items and wants, a batch at a time", () => {
    const left = { linkedItems: 3000, wants: 40, removed: false };
    const batches: Array<{ detach: number; clearWants: number }> = [];
    let done = false;
    while (!done) {
      // As the backend reads it: counted at most one past the budget.
      const read = left.removed
        ? []
        : [
            {
              id: "entry",
              linkedItems: Math.min(left.linkedItems, 501),
              wants: Math.min(left.wants, 501),
            },
          ];
      const batch = planDeletionBatch(read, { complete: true, budget: 500 });
      for (const step of batch.steps) {
        left.linkedItems -= step.detach;
        left.wants -= step.clearWants;
        left.removed ||= step.remove;
        batches.push({ detach: step.detach, clearWants: step.clearWants });
      }
      done = batch.done;
    }
    expect(left).toEqual({ linkedItems: 0, wants: 0, removed: true });
    expect(batches).toEqual([
      { detach: 500, clearWants: 0 },
      { detach: 500, clearWants: 0 },
      { detach: 500, clearWants: 0 },
      { detach: 500, clearWants: 0 },
      { detach: 500, clearWants: 0 },
      { detach: 500, clearWants: 0 },
      { detach: 0, clearWants: 40 },
    ]);
  });

  test("an entry whose wants don't all fit stays for the next batch, and nothing after it goes", () => {
    expect(
      planDeletionBatch(
        [
          { id: "entry-a", linkedItems: 2, wants: 0 },
          { id: "entry-b", linkedItems: 5, wants: 4 },
          { id: "grouping", linkedItems: 0, wants: 0 },
        ],
        { complete: true, budget: 10 },
      ),
    ).toEqual({
      steps: [
        { id: "entry-a", detach: 2, clearWants: 0, remove: true },
        { id: "entry-b", detach: 5, clearWants: 2, remove: false },
      ],
      done: false,
    });
  });

  test("an entry goes in the batch that clears its last want only while there's room to delete it", () => {
    expect(
      planDeletionBatch([{ id: "entry", linkedItems: 6, wants: 4 }], {
        complete: true,
        budget: 10,
      }),
    ).toEqual({
      steps: [{ id: "entry", detach: 6, clearWants: 4, remove: false }],
      done: false,
    });
  });

  test("isn't done while nodes are left beyond those read", () => {
    expect(
      planDeletionBatch([{ id: "entry", linkedItems: 0, wants: 0 }], {
        complete: false,
        budget: 500,
      }),
    ).toEqual({
      steps: [{ id: "entry", detach: 0, clearWants: 0, remove: true }],
      done: false,
    });
  });

  test("a node already gone leaves nothing to do", () => {
    expect(planDeletionBatch([], { complete: true, budget: 500 })).toEqual({
      steps: [],
      done: true,
    });
  });
});
