import { describe, expect, test } from "bun:test";
import type { Doc } from "../_generated/dataModel";
import {
  type ShareableItem,
  isShareToken,
  shareLink,
  sharedItemOf,
  targetIdOf,
} from "./rules";

/** An Item with everything an owner may have recorded, as the backend reads it. */
const item = {
  _id: "item1" as Doc<"items">["_id"],
  _creationTime: 1,
  ownerId: "user1" as Doc<"items">["ownerId"],
  type: "coin",
  title: "1 krone 1908",
  country: "NO",
  year: 1908,
  denomination: "1 krone",
  series: "Haakon VII",
  material: "silver",
  grade: "VF",
  gradingScale: "european",
  strike: "circulation",
  quantity: 2,
  marketValue: 450_00,
  purchasePrice: 300_00,
  purchaseDate: "2024-05-01",
  source: "Oslo Mynthandel",
  storage: "Safe deposit box 2",
  notes: "Inherited from grandfather",
  grader: "pcgs",
  certificateNumber: "12345678",
  serialNumber: "A 123456",
  numistaNumber: 1234,
  catalogEntryId: "entry1" as Doc<"items">["catalogEntryId"],
  frontPhoto: "file1" as Doc<"items">["frontPhoto"],
  thumbnailUrl: "https://example.convex.site/photos?file=thumb1",
} satisfies ShareableItem & Partial<Doc<"items">>;

describe("what a shared page shows of an Item", () => {
  test("is the descriptive facts, the Quantity and the thumbnail, nothing private", () => {
    expect(sharedItemOf(item, false)).toEqual({
      id: item._id,
      type: "coin",
      title: "1 krone 1908",
      country: "NO",
      year: 1908,
      denomination: "1 krone",
      series: "Haakon VII",
      material: "silver",
      grade: "VF",
      gradingScale: "european",
      strike: "circulation",
      quantity: 2,
      thumbnailUrl: "https://example.convex.site/photos?file=thumb1",
    });
  });

  test("adds the Market value only while the share shows values", () => {
    expect(sharedItemOf(item, true).marketValue).toBe(450_00);
    expect(sharedItemOf(item, false)).not.toHaveProperty("marketValue");
    expect(
      sharedItemOf({ ...item, marketValue: undefined }, true),
    ).not.toHaveProperty("marketValue");
  });

  test("leaves out the facts an Item doesn't have, rather than sending undefined", () => {
    const bare = sharedItemOf(
      {
        _id: item._id,
        type: "stamp",
        title: "Posthorn 20 øre",
        quantity: 1,
        thumbnailUrl: null,
      },
      true,
    );
    expect(bare).toEqual({
      id: item._id,
      type: "stamp",
      title: "Posthorn 20 øre",
      quantity: 1,
      thumbnailUrl: null,
    });
    expect(Object.keys(bare)).not.toContain("year");
  });
});

describe("a share link", () => {
  test("is the app's /s path and the token", () => {
    expect(
      shareLink(
        "https://app.coinslite.app",
        "0123456789abcdef0123456789abcdef",
      ),
    ).toBe("https://app.coinslite.app/s/0123456789abcdef0123456789abcdef");
  });

  test("carries 32 hex characters, nothing else", () => {
    expect(isShareToken("0123456789abcdef0123456789abcdef")).toBe(true);
    expect(isShareToken("0123456789ABCDEF0123456789abcdef")).toBe(false);
    expect(isShareToken("0123456789abcdef0123456789abcde")).toBe(false);
    expect(isShareToken("0123456789abcdef0123456789abcdef0")).toBe(false);
    expect(isShareToken("")).toBe(false);
  });
});

describe("what tells shares apart", () => {
  test("is the Album's id for an Album", () => {
    expect(
      targetIdOf({ kind: "album", albumId: "album1" as Doc<"albums">["_id"] }),
    ).toBe("album1");
  });

  test("is the Set's id for a Set, the same whichever way its scope was written", () => {
    expect(targetIdOf({ kind: "set", key: "no" })).toBe("no");
    expect(
      targetIdOf({ kind: "set", key: "no", denomination: "1 krone" }),
    ).toBe(
      targetIdOf({
        kind: "set",
        key: "no",
        denomination: "1 krone",
        series: null,
      }),
    );
    expect(
      targetIdOf({ kind: "set", key: "no", denomination: "1 krone" }),
    ).not.toBe(
      targetIdOf({ kind: "set", key: "no", denomination: "2 kroner" }),
    );
  });
});
