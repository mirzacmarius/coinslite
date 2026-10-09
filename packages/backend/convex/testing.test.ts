/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

async function signUp(t: ReturnType<typeof newTest>, email: string) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "EUR",
    }),
  );
  return t.withIdentity({ subject: `${userId}|session` });
}

test("a test deployment can make an account Premium without a payment", async () => {
  vi.stubEnv("EMAIL_DELIVERY", "outbox");
  const t = newTest();
  const ada = await signUp(t, "ada@example.com");
  expect(await ada.query(api.plans.usage, {})).toMatchObject({ plan: "free" });

  await t.mutation(internal.testing.premium.grant, {
    email: "Ada@Example.com",
  });

  expect(await ada.query(api.plans.usage, {})).toEqual({ plan: "premium" });
});

test("any other deployment refuses, so no real account gets Premium for free", async () => {
  const t = newTest();
  const ada = await signUp(t, "ada@example.com");

  await expect(
    t.mutation(internal.testing.premium.grant, { email: "ada@example.com" }),
  ).rejects.toThrow("TEST_DEPLOYMENTS_ONLY");
  expect(await ada.query(api.plans.usage, {})).toMatchObject({ plan: "free" });
});
