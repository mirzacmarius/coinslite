/// <reference types="vite/client" />
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

test("signed-out callers can't change account data", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.users.generateUploadUrl, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(t.mutation(api.users.removeUserImage, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    t.mutation(api.users.updateUsername, { username: "ada" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(t.action(api.users.deleteCurrentUserAccount, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
});
