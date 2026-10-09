/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { Value } from "convex/values";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { beforeAll, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { createOrUpdateUser } from "./accounts/linking";
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

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

const signIn = (t: Test, params: Record<string, Value>) =>
  t.action(api.auth.signIn, { provider: "password", params });

const signUp = (t: Test, overrides: Record<string, Value> = {}) =>
  signIn(t, {
    flow: "signUp",
    email: "ada@example.com",
    password: "correct horse",
    acceptTerms: "true",
    homeCurrency: "NOK",
    language: "nb",
    ...overrides,
  });

const latestCode = async (t: Test, email: string) => {
  const code = await t.query(internal.accounts.emails.latestCodeFor, { email });
  if (code === null) throw new Error(`No code was sent to ${email}`);
  return code;
};

const users = (t: Test) => t.run((ctx) => ctx.db.query("users").collect());

const signUpAndVerify = async (t: Test, email = "ada@example.com") => {
  await signUp(t, { email });
  const code = await latestCode(t, email);
  return signIn(t, { flow: "email-verification", email, code });
};

const outbox = (t: Test) =>
  t.run((ctx) => ctx.db.query("devOutbox").order("desc").collect());

test("sign-up needs the privacy policy and terms accepted", async () => {
  const t = newTest();

  await expect(signUp(t, { acceptTerms: "false" })).rejects.toThrow(
    "TERMS_NOT_ACCEPTED",
  );
  expect(await users(t)).toEqual([]);
});

test("sign-up needs a password of at least 8 characters", async () => {
  const t = newTest();

  await expect(signUp(t, { password: "short12" })).rejects.toThrow(
    "PASSWORD_TOO_SHORT",
  );
  expect(await users(t)).toEqual([]);
});

test("sign-up needs one of the supported Home currencies", async () => {
  const t = newTest();

  await expect(signUp(t, { homeCurrency: "JPY" })).rejects.toThrow(
    "INVALID_HOME_CURRENCY",
  );
});

test("emails are only accepted trimmed and in lower case, as the forms send them", async () => {
  const t = newTest();

  await expect(signUp(t, { email: " Ada@Example.com" })).rejects.toThrow(
    "INVALID_EMAIL",
  );
  await expect(
    signIn(t, {
      flow: "signIn",
      email: "ADA@example.com",
      password: "correct horse",
    }),
  ).rejects.toThrow("INVALID_EMAIL");
  expect(await users(t)).toEqual([]);
});

test("sign-up creates the profile and emails a code, without signing in", async () => {
  const t = newTest();

  const result = await signUp(t, { email: "ada.lovelace@example.com" });

  expect(result.tokens ?? null).toBeNull();
  const [user] = await users(t);
  expect(user).toMatchObject({
    email: "ada.lovelace@example.com",
    displayName: "ada.lovelace",
    language: "nb",
    homeCurrency: "NOK",
  });
  expect(user.termsAcceptedAt).toEqual(expect.any(Number));
  expect(user.emailVerificationTime).toBeUndefined();

  const [email] = await t.run((ctx) => ctx.db.query("devOutbox").collect());
  expect(email.to).toBe("ada.lovelace@example.com");
  expect(email.subject).toBe("Bekreftelseskoden din for CoinsLite");
  expect(email.code).toMatch(/^\d{8}$/);
  expect(email.text).toContain(
    `http://localhost:3000/verify#email=ada.lovelace%40example.com&code=${email.code}`,
  );
});

test("an account can't sign in until its email is verified", async () => {
  const t = newTest();
  await signUp(t);
  const firstCode = await latestCode(t, "ada@example.com");

  const result = await signIn(t, {
    flow: "signIn",
    email: "ada@example.com",
    password: "correct horse",
  });

  expect(result.tokens ?? null).toBeNull();
  expect(await latestCode(t, "ada@example.com")).not.toBe(firstCode);
});

test("the emailed code verifies the email and signs in", async () => {
  const t = newTest();

  const verified = await signUpAndVerify(t);

  expect(verified.tokens?.token).toEqual(expect.any(String));
  const [user] = await users(t);
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  const signedIn = await signIn(t, {
    flow: "signIn",
    email: "ada@example.com",
    password: "correct horse",
  });
  expect(signedIn.tokens?.token).toEqual(expect.any(String));
});

test("a wrong code is rejected", async () => {
  const t = newTest();
  await signUp(t);
  const code = await latestCode(t, "ada@example.com");
  const wrongCode = code === "00000000" ? "11111111" : "00000000";

  await expect(
    signIn(t, {
      flow: "email-verification",
      email: "ada@example.com",
      code: wrongCode,
    }),
  ).rejects.toThrow();
  const [user] = await users(t);
  expect(user.emailVerificationTime).toBeUndefined();
});

test("a code only works for the address it was sent to", async () => {
  const t = newTest();
  await signUp(t, { email: "ada@example.com" });
  await signUp(t, { email: "bob@example.com" });
  const adasCode = await latestCode(t, "ada@example.com");

  await expect(
    signIn(t, {
      flow: "email-verification",
      email: "bob@example.com",
      code: adasCode,
    }),
  ).rejects.toThrow("INVALID_CODE");
  expect((await users(t)).every((user) => !user.emailVerificationTime)).toBe(
    true,
  );
});

test("a forgotten password is replaced using the emailed code", async () => {
  const t = newTest();
  await signUpAndVerify(t);

  await signIn(t, { flow: "reset", email: "ada@example.com" });
  const [resetEmail] = await t.run((ctx) =>
    ctx.db.query("devOutbox").order("desc").take(1),
  );
  expect(resetEmail.subject).toBe("Tilbakestill passordet ditt for CoinsLite");
  expect(resetEmail.text).toContain("http://localhost:3000/reset#email=");

  await expect(
    signIn(t, {
      flow: "reset-verification",
      email: "ada@example.com",
      code: resetEmail.code ?? "",
      newPassword: "short",
    }),
  ).rejects.toThrow("PASSWORD_TOO_SHORT");

  await signIn(t, { flow: "reset", email: "ada@example.com" });
  const reset = await signIn(t, {
    flow: "reset-verification",
    email: "ada@example.com",
    code: await latestCode(t, "ada@example.com"),
    newPassword: "battery staple",
  });
  expect(reset.tokens?.token).toEqual(expect.any(String));

  await expect(
    signIn(t, {
      flow: "signIn",
      email: "ada@example.com",
      password: "correct horse",
    }),
  ).rejects.toThrow();
  const signedIn = await signIn(t, {
    flow: "signIn",
    email: "ada@example.com",
    password: "battery staple",
  });
  expect(signedIn.tokens?.token).toEqual(expect.any(String));
});

test("a reset code only works for the address it was sent to", async () => {
  const t = newTest();
  await signUpAndVerify(t, "ada@example.com");
  await signUpAndVerify(t, "bob@example.com");
  await signIn(t, { flow: "reset", email: "ada@example.com" });

  await expect(
    signIn(t, {
      flow: "reset-verification",
      email: "bob@example.com",
      code: await latestCode(t, "ada@example.com"),
      newPassword: "taken over",
    }),
  ).rejects.toThrow("INVALID_CODE");
  await expect(
    signIn(t, {
      flow: "signIn",
      email: "bob@example.com",
      password: "taken over",
    }),
  ).rejects.toThrow();
});

test("no more than five code emails an hour go to one address", async () => {
  const t = newTest();
  await signUp(t);
  for (let resend = 0; resend < 4; resend++) {
    await signIn(t, { flow: "email-verification", email: "ada@example.com" });
  }

  await expect(
    signIn(t, { flow: "email-verification", email: "ada@example.com" }),
  ).rejects.toThrow("TOO_MANY_CODE_EMAILS");
  expect(await outbox(t)).toHaveLength(5);
});

test("the emailed link returns to the page the person was heading to", async () => {
  const t = newTest();

  await signUp(t, { redirectTo: "/collection?type=coin" });

  const [email] = await outbox(t);
  const fragment = new URLSearchParams(email.text.split("#")[1]);
  expect(fragment.get("next")).toBe("/collection?type=coin");
  expect(fragment.get("code")).toBe(email.code);
});

test("a deleted account's email can sign up again", async () => {
  const t = newTest();
  await signUpAndVerify(t);
  const [user] = await users(t);

  await t.mutation(internal.users.deleteUserAccount, { userId: user._id });

  expect(await users(t)).toEqual([]);
  expect(await t.run((ctx) => ctx.db.query("authAccounts").collect())).toEqual(
    [],
  );
  const again = await signUp(t);
  expect(again.tokens ?? null).toBeNull();
  expect(await users(t)).toHaveLength(1);
});

// Sign-in links and Google, and how they share one account per email
// (docs/adr/0005-one-account-per-email.md).

const signInWithLink = async (t: Test, email: string) => {
  await t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email },
  });
  const code = await latestCode(t, email);
  return t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email, code },
  });
};

const googleSignIn = (
  t: Test,
  profile: { email: string; emailVerified: boolean },
) =>
  t.run((ctx) =>
    createOrUpdateUser(ctx, {
      existingUserId: null,
      type: "oauth",
      profile: {
        ...profile,
        name: "Ada Lovelace",
        image: "https://example.com/ada.png",
      },
    }),
  );

const signInMethods = (t: Test) =>
  t.run(async (ctx) =>
    (await ctx.db.query("authAccounts").collect())
      .map((account) => account.provider)
      .sort(),
  );

test("a sign-in link signs up a new email, which then finishes setting up", async () => {
  const t = newTest();

  const result = await signInWithLink(t, "ada@example.com");

  expect(result.tokens?.token).toEqual(expect.any(String));
  const [user] = await users(t);
  expect(user).toMatchObject({ email: "ada@example.com", displayName: "ada" });
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  expect(user.termsAcceptedAt).toBeUndefined();
  const [email] = await outbox(t);
  expect(email.text).toContain("method=link");

  await t
    .withIdentity({ subject: `${user._id}|session` })
    .mutation(api.accounts.profile.completeSignUp, {
      homeCurrency: "EUR",
      language: "de",
      acceptTerms: true,
    });
  const [done] = await users(t);
  expect(done).toMatchObject({ homeCurrency: "EUR", language: "de" });
  expect(done.termsAcceptedAt).toEqual(expect.any(Number));
});

test("a sign-in link for a password account's email signs into that account", async () => {
  const t = newTest();
  await signUpAndVerify(t);

  const result = await signInWithLink(t, "ada@example.com");

  expect(result.tokens?.token).toEqual(expect.any(String));
  expect(await users(t)).toHaveLength(1);
  expect(await signInMethods(t)).toEqual(["magic-link", "password"]);
});

test("a password sign-up for an email that already has an account is refused", async () => {
  const t = newTest();
  await signInWithLink(t, "ada@example.com");

  await expect(signUp(t)).rejects.toThrow("ACCOUNT_EXISTS");
  expect(await users(t)).toHaveLength(1);
});

test("an unfinished sign-up is replaced when another method starts for its email", async () => {
  const t = newTest();
  await signUp(t);
  const [pending] = await users(t);

  await signInWithLink(t, "ada@example.com");

  const [user] = await users(t);
  expect(user._id).not.toBe(pending._id);
  expect(user.termsAcceptedAt).toBeUndefined();
  expect(await signInMethods(t)).toEqual(["magic-link"]);
});

test("Google joins the account that has proven the same email", async () => {
  const t = newTest();
  await signUpAndVerify(t);
  const [user] = await users(t);

  const userId = await googleSignIn(t, {
    email: "ada@example.com",
    emailVerified: true,
  });

  expect(userId).toBe(user._id);
  expect(await users(t)).toHaveLength(1);
});

test("Google replaces an unfinished sign-up and starts a verified account", async () => {
  const t = newTest();
  await signUp(t);
  const [pending] = await users(t);

  const userId = await googleSignIn(t, {
    email: "ada@example.com",
    emailVerified: true,
  });

  expect(userId).not.toBe(pending._id);
  const [user] = await users(t);
  expect(user).toMatchObject({
    email: "ada@example.com",
    displayName: "ada",
    name: "Ada Lovelace",
    image: "https://example.com/ada.png",
  });
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  // The person behind the unfinished sign-up never proved the email; their choices don't carry over.
  expect(user.termsAcceptedAt).toBeUndefined();
  expect(user.homeCurrency).toBeUndefined();
});

test("Google sign-in with an unverified email is refused", async () => {
  const t = newTest();

  await expect(
    googleSignIn(t, { email: "ada@example.com", emailVerified: false }),
  ).rejects.toThrow("EMAIL_NOT_VERIFIED");
  expect(await users(t)).toEqual([]);
});

test("finishing sign-up needs a signed-in person and a supported Home currency", async () => {
  const t = newTest();
  await signInWithLink(t, "ada@example.com");
  const [user] = await users(t);

  await expect(
    t.mutation(api.accounts.profile.completeSignUp, {
      homeCurrency: "EUR",
      language: "de",
      acceptTerms: true,
    }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t
      .withIdentity({ subject: `${user._id}|session` })
      .mutation(api.accounts.profile.completeSignUp, {
        // @ts-expect-error Not a Home currency.
        homeCurrency: "JPY",
        language: "de",
        acceptTerms: true,
      }),
  ).rejects.toThrow();
});
