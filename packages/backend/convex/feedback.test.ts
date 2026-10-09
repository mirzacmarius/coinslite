/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const TEAM = "team@coinslite.test";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("EMAIL_DELIVERY", "outbox");
  vi.stubEnv("FEEDBACK_EMAIL", TEAM);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

async function person(t: Test, email: string, extra: { setUp?: boolean } = {}) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

/** Runs the emails due now and returns those that went to `to`. */
const sentTo = async (t: Test, to: string) => {
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  return t.run((ctx) =>
    ctx.db
      .query("devOutbox")
      .withIndex("by_to", (q) => q.eq("to", to))
      .take(50),
  );
};

test("feedback reaches the team by email, saying who sent it", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await ada.as.mutation(api.feedback.send, {
    message: "  Albums for stamps, please.\nThanks!  ",
  });

  const emails = await sentTo(t, TEAM);
  expect(emails).toHaveLength(1);
  expect(emails[0].subject).toBe("CoinsLite feedback from ada@example.com");
  expect(emails[0].text).toContain("Albums for stamps, please.\nThanks!");
  expect(emails[0].text).toContain(`Account id: ${ada.userId}`);
  expect(emails[0].text).toContain("Email: ada@example.com");
});

test("outside the outbox, feedback goes out through Resend and replies reach the sender", async () => {
  vi.stubEnv("EMAIL_DELIVERY", undefined);
  const resend = vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
  );
  vi.stubGlobal("fetch", resend);
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await ada.as.mutation(api.feedback.send, {
    message: "Love it.\nMore, please.",
  });
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();

  expect(resend).toHaveBeenCalledTimes(1);
  const [url, init] = resend.mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  const email = JSON.parse(String(init.body));
  expect(email).toMatchObject({
    to: TEAM,
    reply_to: "ada@example.com",
    subject: "CoinsLite feedback from ada@example.com",
  });
  expect(email.text).toContain(`Account id: ${ada.userId}`);
  expect(email.text).toContain("Email: ada@example.com");
  // Line breaks survive in the HTML part too.
  expect(email.html).toContain("Love it.<br>More, please.");
});

test("each person can send five messages an hour; the sixth waits", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const send = (who: typeof ada, message: string) =>
    who.as.mutation(api.feedback.send, { message });

  for (let n = 1; n <= 5; n++) await send(ada, `Idea ${n}`);
  await expect(send(ada, "Idea 6")).rejects.toThrow("TOO_MANY_REQUESTS");

  // Someone else's messages aren't held up by Ada's.
  await send(bob, "Hello");
  // A message's worth of allowance comes back every 12 minutes.
  vi.advanceTimersByTime(12 * 60 * 1000);
  await send(ada, "Idea 6");

  const emails = await sentTo(t, TEAM);
  expect(emails.map(({ subject }) => subject)).toEqual([
    ...Array(5).fill("CoinsLite feedback from ada@example.com"),
    "CoinsLite feedback from bob@example.com",
    "CoinsLite feedback from ada@example.com",
  ]);
});

test("a message must have text and fit the limit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const send = (message: string) =>
    ada.as.mutation(api.feedback.send, { message });

  await expect(send(" \n ")).rejects.toThrow("MESSAGE_REQUIRED");
  await expect(send("x".repeat(5001))).rejects.toThrow("TOO_LONG");
  // Refused messages don't use up the hourly allowance.
  for (let n = 1; n <= 5; n++) await send(`  ${"x".repeat(5000)}  `);

  expect(await sentTo(t, TEAM)).toHaveLength(5);
});

test("only signed-in people who finished signing up can send feedback", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  await expect(
    t.mutation(api.feedback.send, { message: "Hi" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    newcomer.as.mutation(api.feedback.send, { message: "Hi" }),
  ).rejects.toThrow("NOT_SET_UP");
  expect(await sentTo(t, TEAM)).toEqual([]);
});

test("without a team address, feedback is kept in the deployment log instead of emailed", async () => {
  vi.stubEnv("FEEDBACK_EMAIL", undefined);
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await ada.as.mutation(api.feedback.send, { message: "Dark mode is lovely." });
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();

  expect(await t.run((ctx) => ctx.db.query("devOutbox").take(10))).toEqual([]);
  const logged = log.mock.calls.flat().join(" ");
  expect(logged).toContain("FEEDBACK_EMAIL");
  expect(logged).toContain("Dark mode is lovely.");
  expect(logged).toContain(`Account id: ${ada.userId}`);
});
