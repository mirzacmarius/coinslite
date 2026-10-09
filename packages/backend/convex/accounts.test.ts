/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { Value } from "convex/values";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { beforeAll, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { createOrUpdateUser, googleProfile } from "./accounts/linking";
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

const requestLink = (t: Test, email: string) =>
  t.action(api.auth.signIn, { provider: "magic-link", params: { email } });

const signInWithLink = async (t: Test, email: string) => {
  await requestLink(t, email);
  const code = await latestCode(t, email);
  return t.action(api.auth.signIn, {
    provider: "magic-link",
    params: { email, code },
  });
};

type GoogleClaims = Parameters<typeof googleProfile>[0];

/** What Convex Auth does with a first Google sign-in, minus the OAuth round trip. */
const googleSignIn = (t: Test, claims: Partial<GoogleClaims> = {}) =>
  t.run((ctx) =>
    createOrUpdateUser(ctx, {
      existingUserId: null,
      type: "oauth",
      provider: { id: "google" },
      profile: googleProfile({
        sub: "google-ada",
        email: "ada@gmail.com",
        email_verified: true,
        name: "Ada Lovelace",
        picture: "https://example.com/ada.png",
        ...claims,
      }),
    }),
  );

const signInMethods = (t: Test) =>
  t.run(async (ctx) =>
    (await ctx.db.query("authAccounts").collect())
      .map((account) => account.provider)
      .sort(),
  );

const setUp = (t: Test, userId: string, homeCurrency: "EUR" | "USD") =>
  t
    .withIdentity({ subject: `${userId}|session` })
    .mutation(api.accounts.profile.completeSignUp, {
      homeCurrency,
      language: "de",
      acceptTerms: true,
    });

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

  await setUp(t, user._id, "EUR");
  const [done] = await users(t);
  expect(done).toMatchObject({ homeCurrency: "EUR", language: "de" });
  expect(done.termsAcceptedAt).toEqual(expect.any(Number));
});

test("finishing sign-up a second time changes nothing", async () => {
  const t = newTest();
  await signInWithLink(t, "ada@example.com");
  const [user] = await users(t);
  await setUp(t, user._id, "EUR");

  await setUp(t, user._id, "USD");

  const [after] = await users(t);
  expect(after.homeCurrency).toBe("EUR");
});

test("a sign-in link for a password account's email signs into that account", async () => {
  const t = newTest();
  await signUpAndVerify(t);

  const result = await signInWithLink(t, "ada@example.com");

  expect(result.tokens?.token).toEqual(expect.any(String));
  expect(await users(t)).toHaveLength(1);
  expect(await signInMethods(t)).toEqual(["magic-link", "password"]);
  const [user] = await users(t);
  expect(user).toMatchObject({ homeCurrency: "NOK", language: "nb" });
});

test("a password sign-up for an email that already has an account is refused", async () => {
  const t = newTest();
  await signInWithLink(t, "ada@example.com");

  await expect(signUp(t)).rejects.toThrow("ACCOUNT_EXISTS");
  expect(await users(t)).toHaveLength(1);
});

test("asking for a sign-in link doesn't disturb a sign-up in progress", async () => {
  const t = newTest();
  await signUp(t);
  const [pending] = await users(t);

  await requestLink(t, "ada@example.com");

  const [user] = await users(t);
  expect(user._id).toBe(pending._id);
  expect(user.homeCurrency).toBe("NOK");
  expect(await signInMethods(t)).toEqual(["magic-link", "password"]);
});

test("a password sign-up verified by its own code keeps its choices and drops an unopened link", async () => {
  const t = newTest();
  await signUp(t);
  const code = await latestCode(t, "ada@example.com");
  await requestLink(t, "ada@example.com");

  await signIn(t, {
    flow: "email-verification",
    email: "ada@example.com",
    code,
  });

  const [user] = await users(t);
  expect(user).toMatchObject({ homeCurrency: "NOK", language: "nb" });
  expect(user.termsAcceptedAt).toEqual(expect.any(Number));
  expect(await signInMethods(t)).toEqual(["password"]);
});

test("opening a sign-in link proves the email: an unproven password and its choices go", async () => {
  const t = newTest();
  await signUp(t);
  const [pending] = await users(t);

  await signInWithLink(t, "ada@example.com");

  const [user] = await users(t);
  expect(user._id).toBe(pending._id);
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  expect(user.termsAcceptedAt).toBeUndefined();
  expect(user.homeCurrency).toBeUndefined();
  expect(await signInMethods(t)).toEqual(["magic-link"]);
  await expect(
    signIn(t, {
      flow: "signIn",
      email: "ada@example.com",
      password: "correct horse",
    }),
  ).rejects.toThrow();
});

test("a lookalike address can't reach someone else's account", async () => {
  const t = newTest();
  await signInWithLink(t, "kate@example.com");

  // "\u212A" is the Kelvin sign, which lower-cases to "k".
  await expect(requestLink(t, "\u212Aate@example.com")).rejects.toThrow(
    "INVALID_EMAIL",
  );
  await expect(requestLink(t, "Kate@example.com")).rejects.toThrow(
    "INVALID_EMAIL",
  );
  expect(await outbox(t)).toHaveLength(1);
});

test("a first Google sign-in starts a proven account, which then finishes setting up", async () => {
  const t = newTest();

  await googleSignIn(t);

  const [user] = await users(t);
  expect(user).toMatchObject({
    email: "ada@gmail.com",
    displayName: "ada",
    name: "Ada Lovelace",
    image: "https://example.com/ada.png",
  });
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  expect(user.termsAcceptedAt).toBeUndefined();
});

test("Google joins the account that proved the same email, and leaves its profile alone", async () => {
  const t = newTest();
  await signUpAndVerify(t, "ada@gmail.com");
  const [before] = await users(t);

  const userId = await googleSignIn(t);

  expect(userId).toBe(before._id);
  const [after] = await users(t);
  expect(after).toEqual(before);
});

test("a returning Google sign-in keeps the account as it is", async () => {
  const t = newTest();
  const userId = await googleSignIn(t);
  const [before] = await users(t);

  const again = await t.run((ctx) =>
    createOrUpdateUser(ctx, {
      existingUserId: userId,
      type: "oauth",
      provider: { id: "google" },
      profile: {
        email: "ada@gmail.com",
        emailVerified: true,
        name: "Someone Else",
      },
    }),
  );

  expect(again).toBe(userId);
  expect(await users(t)).toEqual([before]);
});

test("Google proves an unfinished sign-up's email: its password and choices go", async () => {
  const t = newTest();
  await signUp(t, { email: "ada@gmail.com" });
  const [pending] = await users(t);

  const userId = await googleSignIn(t);

  expect(userId).toBe(pending._id);
  const [user] = await users(t);
  expect(user.emailVerificationTime).toEqual(expect.any(Number));
  expect(user.termsAcceptedAt).toBeUndefined();
  expect(user.homeCurrency).toBeUndefined();
  expect(await signInMethods(t)).toEqual([]);
});

test("after Google, a sign-in link reaches the same account and a password sign-up is refused", async () => {
  const t = newTest();
  await googleSignIn(t);

  await signInWithLink(t, "ada@gmail.com");
  await expect(signUp(t, { email: "ada@gmail.com" })).rejects.toThrow(
    "ACCOUNT_EXISTS",
  );

  expect(await users(t)).toHaveLength(1);
});

test("Google vouches only for addresses it hosts", async () => {
  expect(
    googleProfile({ sub: "1", email: "ada@gmail.com", email_verified: true })
      .emailVerified,
  ).toBe(true);
  expect(
    googleProfile({
      sub: "1",
      email: "ada@example.com",
      email_verified: true,
      hd: "example.com",
    }).emailVerified,
  ).toBe(true);
  expect(
    googleProfile({ sub: "1", email: "ada@example.com", email_verified: true })
      .emailVerified,
  ).toBe(false);
  expect(
    googleProfile({ sub: "1", email: " Ada@Gmail.com ", email_verified: true })
      .email,
  ).toBe("ada@gmail.com");

  const t = newTest();
  await expect(googleSignIn(t, { email: "ada@example.com" })).rejects.toThrow(
    "EMAIL_NOT_VERIFIED",
  );
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

test("a sign-in link email is in the language on screen, and its link leaves the language to the app", async () => {
  const t = newTest();

  await t.action(api.auth.signIn, {
    provider: "magic-link",
    params: {
      email: "ada@example.com",
      redirectTo: "/ro/welcome?next=%2Fcatalog",
    },
  });

  const [email] = await outbox(t);
  expect(email.subject).toBe("Linkul tău de conectare CoinsLite");
  const fragment = new URLSearchParams(email.text.split("#")[1]);
  expect(fragment.get("next")).toBe("/welcome?next=%2Fcatalog");
});
