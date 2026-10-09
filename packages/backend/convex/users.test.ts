/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

test("a signed-out caller gets no user", async () => {
  const t = convexTest(schema, modules);

  const user = await t.query(api.users.getUser, {});

  expect(user).toBeNull();
});

test("signed-out callers can't read or change account data", async () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);

  await expect(t.query(api.account.get, {})).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.mutation(api.account.updateContact, { displayName: "Ada" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.mutation(api.account.setLanguage, { language: "de" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.mutation(api.account.requestEmailChange, { newEmail: "ada@example.com" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.action(api.account.deletion.deleteAccount, {}),
  ).rejects.toThrow("NOT_SIGNED_IN");
});
