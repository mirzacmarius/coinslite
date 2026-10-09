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
  const { user, session } = await t.run(async (ctx) => ({
    user: (await ctx.db.query("users").first())!,
    session: (await ctx.db.query("authSessions").first())!,
  }));
  return {
    user,
    as: t.withIdentity({ subject: `${user._id}|${session._id}` }),
    signIn,
  };
}

const sentTo = async (t: Test, to: string) => {
  // Runs the emails due now; a link's expiry, an hour on, stays scheduled.
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
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

  // Only Ada can use the link, and only once.
  const token = tokenIn(link.text);
  await expect(
    t.mutation(api.account.confirmEmailChange, { token }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  const eve = await t.run((ctx) =>
    ctx.db.insert("users", { email: "eve@example.com" }),
  );
  await expect(
    t
      .withIdentity({ subject: `${eve}|session` })
      .mutation(api.account.confirmEmailChange, { token }),
  ).rejects.toThrow("OTHER_ACCOUNT");
  const confirmed = await as.mutation(api.account.confirmEmailChange, {
    token,
  });
  expect(confirmed).toEqual({ email: "ada@lovelace.dev" });
  await expect(
    as.mutation(api.account.confirmEmailChange, { token }),
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
    as.mutation(api.account.confirmEmailChange, { token: tokenIn(first.text) }),
  ).rejects.toThrow("INVALID_LINK");

  vi.advanceTimersByTime(61 * 60 * 1000);
  await t.finishInProgressScheduledFunctions();
  await expect(
    as.mutation(api.account.confirmEmailChange, {
      token: tokenIn(second.text),
    }),
  ).rejects.toThrow("INVALID_LINK");
  const account = await as.query(api.account.get, {});
  expect(account?.email).toBe("ada@example.com");
  expect(account?.pendingEmail).toBeUndefined();
});

test("an email change is refused for the same address, or too often", async () => {
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
  await expect(request("Ada@Lovelace.dev")).rejects.toThrow("INVALID_EMAIL");
  // Bob's address is asked for like any other: the answer comes only to his
  // inbox, so nobody learns who has an account by asking.
  await request("bob@example.com");
  const [link] = await sentTo(t, "bob@example.com");
  await expect(
    as.mutation(api.account.confirmEmailChange, { token: tokenIn(link.text) }),
  ).rejects.toThrow("EMAIL_IN_USE");
  // Five go out an hour (refused requests roll back and don't count); the sixth waits.
  for (let attempt = 1; attempt < 5; attempt++)
    await request(`ada${attempt}@example.org`);
  await expect(request("ada5@example.org")).rejects.toThrow(
    "TOO_MANY_REQUESTS",
  );
});

test("changing email needs a recent sign-in", async () => {
  const t = newTest();
  const { as } = await ada(t);
  vi.advanceTimersByTime(16 * 60 * 1000);

  await expect(
    as.mutation(api.account.requestEmailChange, {
      newEmail: "ada@lovelace.dev",
    }),
  ).rejects.toThrow("SIGN_IN_AGAIN");
});

test("a sign-up that never proved the address gives way to the email change", async () => {
  const t = newTest();
  const { as, user } = await ada(t);
  // Someone asks for a sign-in link to the address and never opens it.
  await t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email: "ada@lovelace.dev" },
  });

  await as.mutation(api.account.requestEmailChange, {
    newEmail: "ada@lovelace.dev",
  });
  const [link] = (await sentTo(t, "ada@lovelace.dev")).filter(({ subject }) =>
    subject.startsWith("Confirm your new"),
  );
  await as.mutation(api.account.confirmEmailChange, {
    token: tokenIn(link.text),
  });

  const { owners, accounts } = await t.run(async (ctx) => ({
    owners: await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "ada@lovelace.dev"))
      .collect(),
    accounts: (await ctx.db.query("authAccounts").collect()).filter(
      ({ providerAccountId }) => providerAccountId === "ada@lovelace.dev",
    ),
  }));
  expect(owners.map(({ _id }) => _id)).toEqual([user._id]);
  expect(accounts.map(({ userId }) => userId)).toEqual([user._id]);
});

test("deleting the account drops a pending email change", async () => {
  const t = newTest();
  const { as, user } = await ada(t);
  await as.mutation(api.account.requestEmailChange, {
    newEmail: "ada@lovelace.dev",
  });

  await as.mutation(api.account.deletion.deleteAccount, {});

  expect(await t.run((ctx) => ctx.db.query("emailChanges").collect())).toEqual(
    [],
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
    as.mutation(api.account.confirmEmailChange, { token: tokenIn(link.text) }),
  ).rejects.toThrow("EMAIL_IN_USE");
  expect((await as.query(api.account.get, {}))?.email).toBe("ada@example.com");
});
