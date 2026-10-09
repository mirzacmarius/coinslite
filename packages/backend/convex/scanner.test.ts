/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { CoinReading, ScanCandidate } from "./scanner/rules";
import { type CoinVision, fakeCoinVision } from "./scanner/vision";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

afterEach(() => {
  fakeCoinVision();
  vi.unstubAllEnvs();
});

async function person(
  t: Test,
  email: string,
  extra: { admin?: boolean; setUp?: boolean; premium?: boolean } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
      ...(extra.admin && { role: "admin" as const }),
    }),
  );
  if (extra.premium) await makePremium(t, userId);
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

/** Makes a person Premium, as a paid subscription reported by Polar does. */
async function makePremium(t: Test, userId: Id<"users">) {
  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId,
      polarId: `sub_${userId}`,
      polarCustomerId: `cus_${userId}`,
      productId: "prod_premium_monthly",
      status: "active",
      interval: "month",
      currency: "NOK",
      amount: 3900,
      cancelAtPeriodEnd: false,
      modifiedAt: Date.now(),
      premium: true,
    }),
  );
}

type Person = Awaited<ReturnType<typeof person>>;

const setScanner = (admin: Person, value: "off" | "admins" | "premiumBeta") =>
  admin.as.mutation(api.featureFlags.set, {
    flag: { key: "scannerAvailability", value },
  });

/** A JPEG file, as far as its first bytes tell. */
const jpeg = (size = 2048) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
  return new Blob([bytes]);
};

/** What the app does: uploads a photo and registers it to the person. */
async function uploadPhoto(t: Test, who: Person, blob = jpeg()) {
  const storageId = await t.run((ctx) => ctx.storage.store(blob));
  await who.as.mutation(api.photos.register, { storageId });
  return storageId;
}

async function photosOf(t: Test, who: Person) {
  return { front: await uploadPhoto(t, who), back: await uploadPhoto(t, who) };
}

/** A reading with nothing read; tests fill in what the photos show. */
const reading = (read: Partial<CoinReading> = {}): CoinReading => ({
  isCoin: true,
  title: null,
  country: null,
  year: null,
  denomination: null,
  series: null,
  material: null,
  mintMark: null,
  ruler: null,
  diameter: null,
  inscriptions: null,
  ...read,
});

/**
 * Answers in the vision model's place: reads `read` from any photos, and
 * picks what `pick` chooses among the candidates (none by default). Keeps
 * what it was asked.
 */
function fakeVision({
  read = reading(),
  pick = () => null,
}: {
  read?: CoinReading | null | (() => Promise<CoinReading | null>);
  pick?: (candidates: ScanCandidate[]) => string | null;
} = {}) {
  const asked = {
    reads: [] as Parameters<CoinVision["read"]>[],
    picks: [] as ScanCandidate[][],
  };
  fakeCoinVision({
    read: async (...args) => {
      asked.reads.push(args);
      return typeof read === "function" ? await read() : read;
    },
    pick: async (_, candidates) => {
      asked.picks.push(candidates);
      return pick(candidates);
    },
  });
  return asked;
}

const credit =
  "Test source,Test author,Test licence,https://example.org/source";
/** A small Catalog of Norwegian and Swedish coins. */
const catalogCsv = [
  "id,parent_id,item_type,title,country,denomination,series,year_from,year_to,material,is_addable,facts_source,facts_author,facts_licence,facts_link",
  "no,,,Norway,NO,,,,,,,,,,",
  `no-krone-1875,no,coin,1 krone 1875,NO,1 krone,Oscar II,1875,1875,silver,true,${credit}`,
  `no-krone-1997,no,coin,1 krone 1997–2001,NO,1 krone,Harald V,1997,2001,cupronickel,true,${credit}`,
  `no-kroner-10,no,coin,10 kroner 1995,NO,10 kroner,Harald V,1995,1995,nickelBrass,true,${credit}`,
  "se,,,Sweden,SE,,,,,,,,,,",
  `se-krona-1875,se,coin,1 krona 1875,SE,1 krona,Oscar II,1875,1875,silver,true,${credit}`,
].join("\n");

/** A scanner open to admins and the Premium beta, a Catalog, and Bea on Premium. */
async function withScanner() {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const report = await admin.as.mutation(api.catalog.csv.importFile, {
    csv: catalogCsv,
  });
  expect(report.applied).toBe(true);
  await setScanner(admin, "premiumBeta");
  const bea = await person(t, "bea@example.com", { premium: true });
  return { t, admin, bea };
}

test("a coin the Catalog holds is suggested as its Catalog entry", async () => {
  const { t, bea } = await withScanner();
  const asked = fakeVision({
    read: reading({
      title: "1 krone 1875",
      country: "no",
      year: 1875,
      denomination: "1 krone",
      series: "Oscar II",
      material: "silver",
    }),
    pick: () => "no-krone-1875",
  });

  const result = await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(result).toEqual({
    outcome: "suggested",
    title: "1 krone 1875",
    entry: { key: "no-krone-1875", title: "1 krone 1875" },
    facts: {},
  });
  // The model chose among this country's krone coins of that year only.
  expect(asked.picks).toHaveLength(1);
  expect(asked.picks[0]?.map(({ key }) => key)).toEqual(["no-krone-1875"]);
});

test("both photos go to the vision model, in the person's language", async () => {
  const { t, bea } = await withScanner();
  await t.run((ctx) => ctx.db.patch(bea.userId, { language: "nb" }));
  const asked = fakeVision();

  await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(asked.reads).toHaveLength(1);
  const [photos, language] = asked.reads[0] ?? [];
  expect(language).toBe("nb");
  expect(photos?.front.mediaType).toBe("image/jpeg");
  expect(photos?.back.mediaType).toBe("image/jpeg");
  expect(atob(photos?.front.base64 ?? "").length).toBe(2048);
});

test("an entry over several years comes with the year read from the coin", async () => {
  const { t, bea } = await withScanner();
  fakeVision({
    read: reading({ country: "NO", year: 1999, denomination: "1 krone" }),
    pick: (candidates) => candidates[0]?.key ?? null,
  });

  const result = await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(result).toEqual({
    outcome: "suggested",
    title: "1 krone 1997–2001",
    entry: { key: "no-krone-1997", title: "1 krone 1997–2001" },
    facts: { year: 1999 },
  });
});

test("without a matching Catalog entry, the facts read are suggested", async () => {
  const { t, bea } = await withScanner();
  const asked = fakeVision({
    read: reading({
      title: "  5 øre 1921 ",
      country: "dk",
      year: 1921,
      denomination: "5 øre",
      material: "bronze",
      mintMark: "HCN",
      ruler: "Christian X",
      diameter: 24,
      inscriptions: "CHRISTIAN X KONGE AF DANMARK",
    }),
  });

  const result = await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(result).toEqual({
    outcome: "suggested",
    title: "5 øre 1921",
    facts: {
      country: "DK",
      year: 1921,
      denomination: "5 øre",
      material: "bronze",
      mintMark: "HCN",
      ruler: "Christian X",
      diameter: 24,
    },
  });
  // Nothing in the Catalog came close, so the model wasn't asked to pick.
  expect(asked.picks).toEqual([]);
});

test("facts an Item couldn't hold are left out of the suggestion", async () => {
  const { t, bea } = await withScanner();
  fakeVision({
    read: reading({
      country: "Atlantis",
      year: 3021,
      denomination: "2 drachmai",
      material: "orichalcum",
      diameter: -4,
      mintMark: "a mint mark far longer than any mint mark is",
    }),
  });

  const result = await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(result).toEqual({
    outcome: "suggested",
    title: "2 drachmai",
    facts: { denomination: "2 drachmai" },
  });
});

test("when the model picks no entry, or one it wasn't offered, the facts read are suggested", async () => {
  const { t, bea } = await withScanner();
  const read = reading({
    title: "1 krone",
    country: "NO",
    denomination: "1 krone",
  });
  for (const pick of [null, "se-krona-1875", "made-up-key"]) {
    fakeVision({ read, pick: () => pick });
    expect(
      await bea.as.action(api.scan.identify, await photosOf(t, bea)),
    ).toEqual({
      outcome: "suggested",
      title: "1 krone",
      facts: { country: "NO", denomination: "1 krone" },
    });
  }
});

test("a coin the model can't read, or a photo that isn't a coin, is unidentified", async () => {
  const { t, bea } = await withScanner();
  const unreadable = {
    "no answer (declined, timed out or malformed)": null,
    "not a coin": reading({ isCoin: false, title: "A teacup" }),
    "too little read to name it": reading({ country: "NO" }),
    "the model failed unexpectedly": async () => {
      throw new Error("socket hang up");
    },
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const [why, read] of Object.entries(unreadable)) {
    fakeVision({ read });
    expect(
      await bea.as.action(api.scan.identify, await photosOf(t, bea)),
      why,
    ).toEqual({ outcome: "unidentified" });
  }
});

test("a failed pick still suggests the facts read", async () => {
  const { t, bea } = await withScanner();
  vi.spyOn(console, "error").mockImplementation(() => {});
  fakeCoinVision({
    read: async () => reading({ title: "1 krone", denomination: "1 krone" }),
    pick: async () => {
      throw new Error("overloaded");
    },
  });

  expect(
    await bea.as.action(api.scan.identify, await photosOf(t, bea)),
  ).toEqual({
    outcome: "suggested",
    title: "1 krone",
    facts: { denomination: "1 krone" },
  });
});

test("while the Catalog is hidden, scans suggest facts only", async () => {
  const { t, admin, bea } = await withScanner();
  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: false },
  });
  const asked = fakeVision({
    read: reading({ title: "1 krone 1875", denomination: "1 krone" }),
    pick: () => "no-krone-1875",
  });

  const result = await bea.as.action(api.scan.identify, await photosOf(t, bea));

  expect(result).toEqual({
    outcome: "suggested",
    title: "1 krone 1875",
    facts: { denomination: "1 krone" },
  });
  expect(asked.picks).toEqual([]);
});

test("the scanner flag decides who may scan, and the Premium beta needs Premium", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const premium = await person(t, "bea@example.com", { premium: true });
  const free = await person(t, "ada@example.com");
  fakeVision({ read: reading({ title: "1 krone" }) });

  const whoCanScan = async () => {
    const allowed: string[] = [];
    for (const [name, who] of Object.entries({ admin, premium, free })) {
      const { available } = await who.as.query(api.scanner.status, {});
      const scan = who.as.action(api.scan.identify, await photosOf(t, who));
      if (available) {
        expect((await scan).outcome).toBe("suggested");
        allowed.push(name);
      } else {
        await expect(scan).rejects.toThrow("SCANNER_NOT_AVAILABLE");
      }
    }
    return allowed;
  };

  expect(await whoCanScan()).toEqual([]);
  await setScanner(admin, "admins");
  expect(await whoCanScan()).toEqual(["admin"]);
  await setScanner(admin, "premiumBeta");
  expect(await whoCanScan()).toEqual(["admin", "premium"]);
  await setScanner(admin, "off");
  expect(await whoCanScan()).toEqual([]);
});

test("signed-out and not-yet-set-up people can't scan", async () => {
  const { t, admin } = await withScanner();
  fakeVision();
  const photos = await photosOf(t, admin);
  await expect(t.action(api.scan.identify, photos)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  expect(await t.query(api.scanner.status, {})).toEqual({
    available: false,
    configured: true,
  });
  const newcomer = await person(t, "new@example.com", {
    setUp: false,
    premium: true,
  });
  await expect(newcomer.as.action(api.scan.identify, photos)).rejects.toThrow(
    "NOT_SET_UP",
  );
});

test("only the person's own fresh uploads can be scanned, one per side", async () => {
  const { t, bea } = await withScanner();
  const ada = await person(t, "ada@example.com", { premium: true });
  fakeVision({ read: reading({ title: "1 krone" }) });
  const own = await uploadPhoto(t, bea);
  const adas = await uploadPhoto(t, ada);
  const unregistered = await t.run((ctx) => ctx.storage.store(jpeg()));

  for (const back of [adas, unregistered, own]) {
    await expect(
      bea.as.action(api.scan.identify, { front: own, back }),
    ).rejects.toThrow("PHOTO_NOT_FOUND");
  }
});

test("a photo too large for the vision model, or not an image, is refused", async () => {
  const { t, bea } = await withScanner();
  const asked = fakeVision();
  const huge = await uploadPhoto(t, bea, jpeg(4 * 1024 * 1024));
  const text = await uploadPhoto(t, bea, new Blob(["not a photo at all"]));

  await expect(
    bea.as.action(api.scan.identify, {
      front: huge,
      back: await uploadPhoto(t, bea),
    }),
  ).rejects.toThrow("PHOTO_TOO_LARGE");
  await expect(
    bea.as.action(api.scan.identify, {
      front: await uploadPhoto(t, bea),
      back: text,
    }),
  ).rejects.toThrow("PHOTO_NOT_AN_IMAGE");
  expect(asked.reads).toEqual([]);
});

test("without the vision model's key, the scanner isn't available on the deployment", async () => {
  const { t, bea } = await withScanner();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  const asked = fakeVision();

  expect(await bea.as.query(api.scanner.status, {})).toEqual({
    available: true,
    configured: false,
  });
  // As often as anyone tries: nothing is counted against their pace.
  for (let scan = 0; scan < 25; scan++) {
    expect(
      await bea.as.action(api.scan.identify, await photosOf(t, bea)),
    ).toEqual({ outcome: "notConfigured" });
  }
  expect(asked.reads).toEqual([]);
});

test("scans are limited to a pace for each person", async () => {
  const { t, admin, bea } = await withScanner();
  fakeVision({ read: reading({ title: "1 krone" }) });

  for (let scan = 0; scan < 20; scan++) {
    await bea.as.action(api.scan.identify, await photosOf(t, bea));
  }
  await expect(
    bea.as.action(api.scan.identify, await photosOf(t, bea)),
  ).rejects.toThrow("TOO_MANY_SCANS");
  // Someone else still scans.
  expect(
    (await admin.as.action(api.scan.identify, await photosOf(t, admin)))
      .outcome,
  ).toBe("suggested");
});

test("the scanned photos become the photos of the Item added from the suggestion", async () => {
  const { t, bea } = await withScanner();
  fakeVision({
    read: reading({ country: "NO", year: 1875, denomination: "1 krone" }),
    pick: () => "no-krone-1875",
  });
  const photos = await photosOf(t, bea);
  const result = await bea.as.action(api.scan.identify, photos);
  if (result.outcome !== "suggested" || !result.entry)
    throw new Error("expected an entry");

  const itemId = await bea.as.mutation(api.items.add, {
    type: "coin",
    title: result.title,
    catalogEntryKey: result.entry.key,
  });
  for (const side of ["front", "back"] as const) {
    await bea.as.action(api.photos.attach, {
      itemId,
      side,
      storageId: photos[side],
    });
  }

  const item = await bea.as.query(api.items.get, { itemId });
  expect(item).toMatchObject({
    title: "1 krone 1875",
    year: 1875,
    denomination: "1 krone",
    frontPhoto: photos.front,
    backPhoto: photos.back,
  });
});
