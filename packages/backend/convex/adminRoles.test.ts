/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

async function person(t: Test, email: string) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "EUR" as const,
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

const csv = "id,title\nus,United States\n";

test("the admin role is granted and revoked by email, and admin-only functions follow it", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");

  expect(await t.query(api.admin.roles.isAdmin, {})).toBe(false);
  expect(await ada.as.query(api.admin.roles.isAdmin, {})).toBe(false);

  await t.mutation(internal.admin.roles.grant, { email: " Ada@Example.com " });

  expect(await ada.as.query(api.admin.roles.isAdmin, {})).toBe(true);
  expect(await bob.as.query(api.admin.roles.isAdmin, {})).toBe(false);
  await expect(
    ada.as.query(api.catalog.csv.preview, { csv }),
  ).resolves.toMatchObject({ inserts: 1 });
  await expect(bob.as.query(api.catalog.csv.preview, { csv })).rejects.toThrow(
    "NOT_ADMIN",
  );

  await t.mutation(internal.admin.roles.revoke, { email: "ada@example.com" });

  expect(await ada.as.query(api.admin.roles.isAdmin, {})).toBe(false);
  await expect(ada.as.query(api.catalog.csv.preview, { csv })).rejects.toThrow(
    "NOT_ADMIN",
  );
});

test("granting the role to an email without an account fails", async () => {
  const t = newTest();

  await expect(
    t.mutation(internal.admin.roles.grant, { email: "nobody@example.com" }),
  ).rejects.toThrow("USER_NOT_FOUND");
});
