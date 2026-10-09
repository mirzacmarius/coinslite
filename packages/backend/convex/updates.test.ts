/// <reference types="vite/client" />
import { locales } from "@coinslite/i18n";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { beforeAll, expect, onTestFinished, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { type ReleaseNotes, releaseGroups, releases } from "./updates/releases";

const modules = import.meta.glob("./**/*.*s");

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  process.env.JWT_PRIVATE_KEY = (await exportPKCS8(privateKey))
    .trimEnd()
    .replace(/\n/g, " ");
  process.env.JWKS = JSON.stringify({
    keys: [{ use: "sig", ...(await exportJWK(publicKey)) }],
  });
  process.env.SITE_URL = "http://localhost:3000";
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
  process.env.EMAIL_DELIVERY = "outbox";
});

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};
type Test = ReturnType<typeof newTest>;

/**
 * A release that ships during a test (and is gone after it). Tests use versions
 * no real release will have, such as "99.0". Its notes say which language they're in.
 */
function ship(version: string, date = "2027-03-01") {
  const notes = (language: string): ReleaseNotes => ({
    highlights: [`${version} highlight (${language})`],
    catalog: [`${version} Catalog content (${language})`],
    fixes: [`${version} fix (${language})`],
  });
  releases.unshift({
    version,
    date,
    notes: {
      en: notes("en"),
      nb: notes("nb"),
      de: notes("de"),
      fr: notes("fr"),
      ro: notes("ro"),
    },
  });
  onTestFinished(() => {
    releases.splice(
      releases.findIndex((release) => release.version === version),
      1,
    );
  });
}

/** Signs up with email and password and enters the emailed code, as the sign-up form does. */
async function passwordSignUp(t: Test, email: string) {
  await t.action(api.auth.signIn, {
    provider: "password",
    params: {
      flow: "signUp",
      email,
      password: "correct horse",
      acceptTerms: "true",
      homeCurrency: "NOK",
      language: "en",
    },
  });
  const code = await t.query(internal.accounts.emails.latestCodeFor, { email });
  if (code === null) throw new Error(`No code was sent to ${email}`);
  await t.action(api.auth.signIn, {
    provider: "password",
    params: { flow: "email-verification", email, code },
  });
  return signedIn(t, email);
}

async function signedIn(t: Test, email: string) {
  const user = await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique(),
  );
  if (!user) throw new Error(`No account for ${email}`);
  return t.withIdentity({ subject: `${user._id}|session` });
}

test("a new account starts at the current release: no marker and no highlights", async () => {
  const t = newTest();

  const ada = await passwordSignUp(t, "ada@example.com");

  expect(await ada.query(api.updates.status, { language: "en" })).toEqual({
    unseen: false,
    highlights: null,
  });
});

/** Signs up with an emailed sign-in link, then finishes setting up as /welcome does. */
async function linkSignUp(t: Test, email: string) {
  await t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email },
  });
  const code = await t.query(internal.accounts.emails.latestCodeFor, { email });
  if (code === null) throw new Error(`No link was sent to ${email}`);
  await t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email, code },
  });
  const person = await signedIn(t, email);
  await person.mutation(api.accounts.profile.completeSignUp, {
    homeCurrency: "EUR",
    language: "de",
    acceptTerms: true,
  });
  return person;
}

test("an account set up after a sign-in link or Google also starts at the current release", async () => {
  const t = newTest();

  const ada = await linkSignUp(t, "ada@example.com");

  expect(await ada.query(api.updates.status, { language: "de" })).toEqual({
    unseen: false,
    highlights: null,
  });
});

test("after a new release, its highlights are shown in the language asked for", async () => {
  const t = newTest();
  const ada = await passwordSignUp(t, "ada@example.com");

  ship("99.0");

  expect(await ada.query(api.updates.status, { language: "nb" })).toEqual({
    unseen: true,
    highlights: {
      version: "99.0",
      date: "2027-03-01",
      lines: ["99.0 highlight (nb)"],
    },
  });
});

test("the highlights are shown once; the marker stays until the list is opened", async () => {
  const t = newTest();
  const ada = await passwordSignUp(t, "ada@example.com");
  ship("99.0");

  await ada.mutation(api.updates.dismissHighlights, {});

  expect(await ada.query(api.updates.status, { language: "en" })).toEqual({
    unseen: true,
    highlights: null,
  });
});

test("opening the list marks the latest release as seen: no marker and no highlights", async () => {
  const t = newTest();
  const ada = await passwordSignUp(t, "ada@example.com");
  ship("99.0");

  await ada.mutation(api.updates.markSeen, {});

  expect(await ada.query(api.updates.status, { language: "en" })).toEqual({
    unseen: false,
    highlights: null,
  });
});

test("each new release brings the marker and its highlights back", async () => {
  const t = newTest();
  const ada = await passwordSignUp(t, "ada@example.com");
  ship("99.0");
  await ada.mutation(api.updates.dismissHighlights, {});
  await ada.mutation(api.updates.markSeen, {});

  ship("99.1", "2027-06-01");

  expect(await ada.query(api.updates.status, { language: "en" })).toEqual({
    unseen: true,
    highlights: {
      version: "99.1",
      date: "2027-06-01",
      lines: ["99.1 highlight (en)"],
    },
  });
});

test("an account from before a release sees its highlights", async () => {
  const t = newTest();
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "ada@example.com",
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK",
    }),
  );
  const ada = t.withIdentity({ subject: `${userId}|session` });
  ship("99.0");

  const status = await ada.query(api.updates.status, { language: "en" });

  expect(status?.unseen).toBe(true);
  expect(status?.highlights?.version).toBe("99.0");
});

test("the list holds every release, newest first, its notes grouped in the language asked for", async () => {
  const t = newTest();
  ship("99.0");

  const list = await t.query(api.updates.list, { language: "fr" });

  expect(list[0]).toEqual({
    version: "99.0",
    date: "2027-03-01",
    catalog: ["99.0 Catalog content (fr)"],
    features: [],
    improvements: [],
    fixes: ["99.0 fix (fr)"],
  });
  expect(list).toHaveLength(releases.length);
  expect(list.at(-1)?.version).toBe("1.0");
});

test("what one person has seen doesn't change what another is shown", async () => {
  const t = newTest();
  const ada = await passwordSignUp(t, "ada@example.com");
  const bob = await passwordSignUp(t, "bob@example.com");
  ship("99.0");

  await ada.mutation(api.updates.markSeen, {});

  expect(await bob.query(api.updates.status, { language: "en" })).toMatchObject(
    { unseen: true, highlights: { version: "99.0" } },
  );
});

test("signed out there's nothing to tell, and nothing can be marked", async () => {
  const t = newTest();

  expect(await t.query(api.updates.status, { language: "en" })).toBeNull();
  await expect(t.mutation(api.updates.markSeen, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(t.mutation(api.updates.dismissHighlights, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
});

test("someone who hasn't finished signing up is told nothing yet", async () => {
  const t = newTest();
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "ada@gmail.com",
      emailVerificationTime: Date.now(),
    }),
  );
  ship("99.0");

  const status = await t
    .withIdentity({ subject: `${userId}|session` })
    .query(api.updates.status, { language: "en" });

  expect(status).toBeNull();
});

test("every release has a unique version and a date, newest first, and the same notes in every language", () => {
  const versions = releases.map((release) => release.version);
  expect(new Set(versions).size).toBe(versions.length);
  const dates = releases.map((release) => release.date);
  for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(dates).toEqual([...dates].sort().reverse());

  for (const { version, notes } of releases) {
    const shape = (language: (typeof locales)[number]) => ({
      highlights: notes[language].highlights.length,
      ...Object.fromEntries(
        releaseGroups.map((group) => [group, notes[language][group]?.length]),
      ),
    });
    expect(notes.en.highlights.length, version).toBeGreaterThan(0);
    for (const language of locales) {
      expect(shape(language), `${version} in ${language}`).toEqual(shape("en"));
      const lines = [
        ...notes[language].highlights,
        ...releaseGroups.flatMap((group) => notes[language][group] ?? []),
      ];
      for (const line of lines) expect(line.trim(), version).not.toBe("");
    }
  }
});
