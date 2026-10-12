import { describe, expect, test } from "bun:test";
import { type FoundSet, closestSets, combineSetProgress } from "./setProgress";

/** A grouping Set with `total` entries, named after its key. */
const grouping = (key: string, total: number): FoundSet => ({
  id: key,
  scope: { key },
  node: { key, title: key, countryNode: false },
  total,
});

/** `count` held entries in the Set with this id, numbered from `from`. */
const heldIn = (setId: string, count: number, from = 1) =>
  Array.from({ length: count }, (_, at) => ({
    id: `${setId}-entry-${from + at}`,
    sets: [setId],
  }));

/** What the Overview shows of each Set chosen: its key, held, total and %. */
const shown = (sets: ReturnType<typeof closestSets>) =>
  sets.map(({ scope, held, total, percent }) => [
    scope.key,
    held,
    total,
    percent,
  ]);

describe("the Sets the Overview shows", () => {
  test("are those most nearly complete first, with held / total and %", () => {
    expect(
      shown(
        closestSets({
          sets: [
            grouping("haakon-vii-1-ore", 10),
            grouping("olav-v-1-krone", 4),
            grouping("morgan-dollars", 96),
          ],
          held: [
            ...heldIn("haakon-vii-1-ore", 3),
            ...heldIn("olav-v-1-krone", 3),
            ...heldIn("morgan-dollars", 60),
          ],
        }),
      ),
    ).toEqual([
      ["olav-v-1-krone", 3, 4, 75],
      ["morgan-dollars", 60, 96, 62],
      ["haakon-vii-1-ore", 3, 10, 30],
    ]);
  });

  test("leave out the Sets already complete: there's nothing left to add", () => {
    expect(
      shown(
        closestSets({
          sets: [grouping("olav-v-1-krone", 4), grouping("morgan-dollars", 96)],
          held: [
            ...heldIn("olav-v-1-krone", 4),
            ...heldIn("morgan-dollars", 1),
          ],
        }),
      ),
    ).toEqual([["morgan-dollars", 1, 96, 1]]);
  });

  test("put the one with fewer entries missing first when two are as complete", () => {
    expect(
      shown(
        closestSets({
          sets: [
            grouping("morgan-dollars", 100),
            grouping("olav-v-1-krone", 2),
          ],
          held: [
            ...heldIn("morgan-dollars", 50),
            ...heldIn("olav-v-1-krone", 1),
          ],
        }),
      ),
    ).toEqual([
      ["olav-v-1-krone", 1, 2, 50],
      ["morgan-dollars", 50, 100, 50],
    ]);
  });

  test("are three at most", () => {
    const keys = ["a", "b", "c", "d"];
    expect(
      shown(
        closestSets({
          sets: keys.map((key) => grouping(key, 10)),
          held: keys.flatMap((key, at) => heldIn(key, at + 1)),
        }),
      ),
    ).toEqual([
      ["d", 4, 10, 40],
      ["c", 3, 10, 30],
      ["b", 2, 10, 20],
    ]);
  });

  test("count an entry toward every Set it is in, as each Set view does", () => {
    // 1 øre of Haakon VII is a Set, and so is all of Haakon VII above it.
    expect(
      shown(
        closestSets({
          sets: [grouping("haakon-vii", 40), grouping("haakon-vii-1-ore", 8)],
          held: [
            { id: "1-ore-1908", sets: ["haakon-vii", "haakon-vii-1-ore"] },
            { id: "1-ore-1910", sets: ["haakon-vii", "haakon-vii-1-ore"] },
            { id: "2-ore-1909", sets: ["haakon-vii"] },
          ],
        }),
      ),
    ).toEqual([
      ["haakon-vii-1-ore", 2, 8, 25],
      ["haakon-vii", 3, 40, 7],
    ]);
  });
});

describe("Set progress across pages of Items", () => {
  test("counts an entry held on two pages once, and shows a Set found on both once", () => {
    const firstPage = {
      sets: [grouping("olav-v-1-krone", 4)],
      held: heldIn("olav-v-1-krone", 2),
    };
    // Another Item of entry 2, and one of entry 3.
    const secondPage = {
      sets: [grouping("olav-v-1-krone", 4)],
      held: heldIn("olav-v-1-krone", 2, 2),
    };
    expect(
      shown(closestSets(combineSetProgress(firstPage, secondPage))),
    ).toEqual([["olav-v-1-krone", 3, 4, 75]]);
  });
});
