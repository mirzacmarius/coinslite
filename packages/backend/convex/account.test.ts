/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

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
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** Ada signs up with a password and verifies her email, as the app does. */
async function ada(t: Test) {
  const signIn = (params: Record<string, string>) =>
    t.action(api.auth.signIn, { provider: "password", params });
  await signIn({
    flow: "signUp",
    email: "ada@example.com",
    password: "correct horse",
    acceptTerms: "true",
    homeCurrency: "NOK",
    language: "en",
  });
  const code = await t.run(
    async (ctx) =>
      (await ctx.db.query("devOutbox").order("desc").first())?.code ?? "",
  );
  await signIn({ flow: "email-verification", email: "ada@example.com", code });
  const user = await t.run(
    async (ctx) => (await ctx.db.query("users").first())!,
  );
  return {
    user,
    as: t.withIdentity({ subject: `${user._id}|session` }),
    signIn,
  };
}

const sentTo = async (t: Test, to: string) => {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  return t.run(async (ctx) =>
    (await ctx.db.query("devOutbox").collect()).filter(
      (email) => email.to === to,
    ),
  );
};

const tokenIn = (text: string) =>
  new URLSearchParams(text.split("#")[1]?.split(/\s/)[0] ?? "").get("token") ??
  "";

test("the Account screen shows who you are, your plan and your details", async () => {
  const t = newTest();
  const { as } = await ada(t);

  expect(await as.query(api.account.get, {}))?.toMatchObject({
    email: "ada@example.com",
    displayName: "ada",
    homeCurrency: "NOK",
    language: "en",
    plan: "free",
  });
});

test("contact details are saved tidy, and an emptied field is cleared", async () => {
  const t = newTest();
  const { as } = await ada(t);
  const details = {
    displayName: " Ada ",
    fullName: "Ada Lovelace",
    streetAddress: "12 St James's Square",
    postalCode: "SW1Y 4JH",
    city: "London",
    country: "gb",
    contactPhone: "+44 20 7946 0000",
  };

  await as.mutation(api.account.updateContact, details);
  expect(await as.query(api.account.get, {}))?.toMatchObject({
    ...details,
    displayName: "Ada",
    country: "GB",
  });

  await as.mutation(api.account.updateContact, {
    ...details,
    contactPhone: "  ",
  });
  expect((await as.query(api.account.get, {}))?.contactPhone).toBeUndefined();
});

test("contact details are checked", async () => {
  const t = newTest();
  const { as } = await ada(t);
  const update = (changes: Record<string, string>) =>
    as.mutation(api.account.updateContact, { displayName: "Ada", ...changes });

  await expect(update({ displayName: " " })).rejects.toThrow(
    "DISPLAY_NAME_REQUIRED",
  );
  await expect(update({ country: "XX" })).rejects.toThrow("INVALID_COUNTRY");
  await expect(update({ contactPhone: "call me" })).rejects.toThrow(
    "INVALID_PHONE",
  );
  await expect(update({ city: "x".repeat(101) })).rejects.toThrow("TOO_LONG");
});

test("the language preference is stored on the account", async () => {
  const t = newTest();
  const { as } = await ada(t);

  await as.mutation(api.account.setLanguage, { language: "ro" });

  expect((await as.query(api.account.get, {}))?.language).toBe("ro");
});

test("changing email: a link goes to the new address, and nothing changes until it's opened", async () => {
  const t = newTest();
  const { as, signIn } = await ada(t);

  await as.mutation(api.account.requestEmailChange, {
    newEmail: "ada@lovelace.dev",
  });

  expect(await as.query(api.account.get, {}))?.toMatchObject({
    email: "ada@example.com",
    pendingEmail: "ada@lovelace.dev",
  });
  const [link] = await sentTo(t, "ada@lovelace.dev");
  expect(link.subject).toBe("Confirm your new CoinsLite email");
  expect(link.text).toContain("http://localhost:3000/confirm-email#token=");

  // The link works without a session, once.
  const confirmed = await t.mutation(api.account.confirmEmailChange, {
    token: tokenIn(link.text),
  });
  expect(confirmed).toEqual({ email: "ada@lovelace.dev" });
  await expect(
    t.mutation(api.account.confirmEmailChange, { token: tokenIn(link.text) }),
  ).rejects.toThrow("INVALID_LINK");

  expect(await as.query(api.account.get, {}))?.toMatchObject({
    email: "ada@lovelace.dev",
  });
  const [notice] = await sentTo(t, "ada@example.com").then((emails) =>
    emails.filter(
      ({ subject }) => subject === "Your CoinsLite email was changed",
    ),
  );
  expect(notice.text).toContain("ada@lovelace.dev");
  // The password now belongs to the new address.
  const result = await signIn({
    flow: "signIn",
    email: "ada@lovelace.dev",
    password: "correct horse",
  });
  expect(result.tokens?.token).toEqual(expect.any(String));
  await expect(
    signIn({
      flow: "signIn",
      email: "ada@example.com",
      password: "correct horse",
    }),
  ).rejects.toThrow();
});

test("a newer email change replaces an older one, and links expire after an hour", async () => {
  const t = newTest();
  const { as } = await ada(t);
  await as.mutation(api.account.requestEmailChange, {
    newEmail: "first@example.com",
  });
  const [first] = await sentTo(t, "first@example.com");
  await as.mutation(api.account.requestEmailChange, {
    newEmail: "second@example.com",
  });
  const [second] = await sentTo(t, "second@example.com");

  await expect(
    t.mutation(api.account.confirmEmailChange, { token: tokenIn(first.text) }),
  ).rejects.toThrow("INVALID_LINK");

  vi.advanceTimersByTime(61 * 60 * 1000);
  await expect(
    t.mutation(api.account.confirmEmailChange, { token: tokenIn(second.text) }),
  ).rejects.toThrow("INVALID_LINK");
  expect((await as.query(api.account.get, {}))?.email).toBe("ada@example.com");
});

test("an email change is refused for the same address, an address in use, or too often", async () => {
  const t = newTest();
  const { as } = await ada(t);
  await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "bob@example.com",
      emailVerificationTime: Date.now(),
    }),
  );
  const request = (newEmail: string) =>
    as.mutation(api.account.requestEmailChange, { newEmail });

  await expect(request("ada@example.com")).rejects.toThrow("SAME_EMAIL");
  await expect(request("bob@example.com")).rejects.toThrow("EMAIL_IN_USE");
  await expect(request("Ada@Lovelace.dev")).rejects.toThrow("INVALID_EMAIL");
  // Five go out (refused requests roll back and don't count); the sixth waits.
  for (let attempt = 0; attempt < 5; attempt++)
    await request(`ada${attempt}@example.org`);
  await expect(request("ada5@example.org")).rejects.toThrow(
    "TOO_MANY_REQUESTS",
  );
});

test("an address taken between the request and the link is not handed over", async () => {
  const t = newTest();
  const { as } = await ada(t);
  await as.mutation(api.account.requestEmailChange, {
    newEmail: "taken@example.com",
  });
  const [link] = await sentTo(t, "taken@example.com");
  await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "taken@example.com",
      emailVerificationTime: Date.now(),
    }),
  );

  await expect(
    t.mutation(api.account.confirmEmailChange, { token: tokenIn(link.text) }),
  ).rejects.toThrow("EMAIL_IN_USE");
  expect((await as.query(api.account.get, {}))?.email).toBe("ada@example.com");
});
