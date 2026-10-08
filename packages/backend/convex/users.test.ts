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
