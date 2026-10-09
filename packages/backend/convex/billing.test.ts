/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 24 * 60 * 60 * 1000;

/** A webhook secret made up for these tests, shaped like the ones Polar issues. */
const SECRET = `polar_whs_${crypto.randomUUID().replaceAll("-", "")}`;
const MONTHLY = "prod_premium_monthly";
const YEARLY = "prod_premium_yearly";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  vi.stubEnv("POLAR_WEBHOOK_SECRET", SECRET);
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

/** A person who has finished signing up, signed in. */
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

/** Fills a Collection with `count` Items. */
async function collectionOf(t: Test, ownerId: Id<"users">, count: number) {
  await t.run(async (ctx) => {
    for (let n = 1; n <= count; n++) {
      await ctx.db.insert("items", {
        ownerId,
        type: "coin",
        title: `Krone ${n}`,
        quantity: 1,
      });
    }
  });
}

const krone = { type: "coin" as const, title: "1 krone 1875" };
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * A Polar subscription event for `userId`, as Polar sends it after checkout:
 * the buyer's id is on the customer (external id) and in the metadata.
 * `data` overrides fields of the subscription, in Polar's own spelling.
 */
function subscriptionEvent(
  type: string,
  userId: string,
  data: Record<string, unknown> = {},
) {
  const now = Date.now();
  return {
    type,
    timestamp: iso(now),
    data: {
      id: "sub_1",
      created_at: iso(now),
      modified_at: iso(now),
      amount: 3900,
      currency: "nok",
      recurring_interval: "month",
      recurring_interval_count: 1,
      status: "active",
      current_period_start: iso(now),
      current_period_end: iso(now + 30 * DAY),
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      canceled_at: null,
      started_at: iso(now),
      ends_at: null,
      ended_at: null,
      customer_id: "cus_1",
      product_id: MONTHLY,
      discount_id: null,
      checkout_id: "chk_1",
      metadata: { userId },
      customer: {
        id: "cus_1",
        external_id: userId,
        email: "ada@example.com",
      },
      product: { id: MONTHLY, name: "Premium", recurring_interval: "month" },
      ...data,
    },
  };
}

const encoder = new TextEncoder();

/**
 * Signs a webhook the way Polar does (Standard Webhooks): an HMAC-SHA256 of
 * "id.timestamp.body", keyed with the secret's own bytes.
 */
async function polarSignature(
  secret: string,
  id: string,
  timestamp: number,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${id}.${timestamp}.${body}`),
  );
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`;
}

let deliveries = 0;

/** Delivers an event to the webhook endpoint, signed with `secret`. */
async function deliver(
  t: Test,
  event: unknown,
  {
    secret = SECRET,
    sentAt = Date.now(),
    tamper,
  }: {
    secret?: string;
    sentAt?: number;
    tamper?: (body: string) => string;
  } = {},
) {
  const body = JSON.stringify(event);
  const id = `msg_${++deliveries}`;
  const timestamp = Math.floor(sentAt / 1000);
  return await t.fetch("/polar/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": await polarSignature(secret, id, timestamp, body),
    },
    body: tamper ? tamper(body) : body,
  });
}

test("once Polar confirms the subscription the buyer is on Premium, with no Item limit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await collectionOf(t, ada.userId, 50);
  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );

  const response = await deliver(
    t,
    subscriptionEvent("subscription.created", ada.userId),
  );

  expect(response.status).toBe(202);
  expect(await ada.as.query(api.plans.usage, {})).toEqual({
    plan: "premium",
  });
  await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.items.add, krone);
});

test("an event without Polar's signature is turned away and changes nothing", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const event = subscriptionEvent("subscription.created", ada.userId);
  const otherSecret = `polar_whs_${crypto.randomUUID().replaceAll("-", "")}`;

  const refused = [
    await deliver(t, event, { secret: otherSecret }),
    await deliver(t, event, {
      tamper: (body) => body.replace('"active"', '"trialing"'),
    }),
    await deliver(t, event, { sentAt: Date.now() - 10 * 60 * 1000 }),
    await t.fetch("/polar/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    }),
  ];

  expect(refused.map((response) => response.status)).toEqual([
    403, 403, 403, 403,
  ]);
  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    plan: "free",
  });
});

test("without a webhook secret on the deployment, Polar's events are refused", async () => {
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "");
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const response = await deliver(
    t,
    subscriptionEvent("subscription.created", ada.userId),
  );

  expect(response.status).toBe(503);
  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    plan: "free",
  });
});

/** Lets `ms` pass and runs whatever was scheduled meanwhile. */
async function wait(t: Test, ms: number) {
  vi.advanceTimersByTime(ms);
  await t.finishInProgressScheduledFunctions();
}

test("a cancelled subscription stays Premium until the end of the paid period", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await collectionOf(t, ada.userId, 50);
  const periodEnd = Date.now() + 10 * DAY;
  await deliver(
    t,
    subscriptionEvent("subscription.created", ada.userId, {
      current_period_end: iso(periodEnd),
    }),
  );

  await deliver(
    t,
    subscriptionEvent("subscription.canceled", ada.userId, {
      current_period_end: iso(periodEnd),
      cancel_at_period_end: true,
      canceled_at: iso(Date.now()),
      ends_at: iso(periodEnd),
    }),
  );
  await wait(t, 10 * DAY - 60_000);

  expect(await ada.as.query(api.plans.usage, {})).toEqual({
    plan: "premium",
  });
  await ada.as.mutation(api.items.add, krone);

  await wait(t, 60_000);

  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    plan: "free",
    used: 51,
    canAdd: false,
  });
  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
});

type Person = Awaited<ReturnType<typeof person>>;

const planOfPerson = async (who: Person) =>
  (await who.as.query(api.plans.usage, {}))?.plan;

test("trialing and past-due subscriptions are Premium within their period; unpaid and incomplete ones aren't", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const status = async (status: string, modifiedAt: number) => {
    await deliver(
      t,
      subscriptionEvent("subscription.updated", ada.userId, {
        status,
        modified_at: iso(modifiedAt),
      }),
    );
    return await planOfPerson(ada);
  };
  const now = Date.now();

  expect(await status("incomplete", now)).toBe("free");
  expect(await status("trialing", now + 1)).toBe("premium");
  expect(await status("active", now + 2)).toBe("premium");
  expect(await status("past_due", now + 3)).toBe("premium");
  expect(await status("unpaid", now + 4)).toBe("free");
  expect(await status("paused", now + 5)).toBe("free");
});

test("a renewal keeps Premium going; a period that ends with no renewal ends it", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const firstEnd = Date.now() + 30 * DAY;
  await deliver(
    t,
    subscriptionEvent("subscription.created", ada.userId, {
      current_period_end: iso(firstEnd),
    }),
  );

  // Renewals take a moment to come through: Premium doesn't flicker meanwhile.
  await wait(t, 30 * DAY + 60 * 60 * 1000);
  expect(await planOfPerson(ada)).toBe("premium");
  await deliver(
    t,
    subscriptionEvent("subscription.updated", ada.userId, {
      current_period_start: iso(firstEnd),
      current_period_end: iso(firstEnd + 30 * DAY),
    }),
  );
  await wait(t, 2 * DAY);
  expect(await planOfPerson(ada)).toBe("premium");

  // No renewal reported for the second period: a day after it ends, Premium does.
  await wait(t, 28 * DAY);
  expect(await planOfPerson(ada)).toBe("premium");
  await wait(t, DAY);
  expect(await planOfPerson(ada)).toBe("free");
});

test("a revoked subscription ends Premium at once, even inside a paid period", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await deliver(t, subscriptionEvent("subscription.created", ada.userId));

  await deliver(
    t,
    subscriptionEvent("subscription.revoked", ada.userId, {
      status: "canceled",
      canceled_at: iso(Date.now()),
      ended_at: iso(Date.now()),
      modified_at: iso(Date.now() + 1),
    }),
  );

  expect(await planOfPerson(ada)).toBe("free");
});

test("an event that arrives late doesn't undo a newer one", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const created = subscriptionEvent("subscription.created", ada.userId, {
    status: "incomplete",
  });
  const activated = subscriptionEvent("subscription.active", ada.userId, {
    modified_at: iso(Date.now() + 1000),
  });

  await deliver(t, activated);
  await deliver(t, created);

  expect(await planOfPerson(ada)).toBe("premium");
});

test("a subscription makes only its own buyer Premium", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const ben = await person(t, "ben@example.com");
  await deliver(t, subscriptionEvent("subscription.created", ada.userId));

  // A later event can't hand Ada's subscription to someone else.
  await deliver(
    t,
    subscriptionEvent("subscription.updated", ben.userId, {
      modified_at: iso(Date.now() + 1000),
    }),
  );

  expect(await planOfPerson(ada)).toBe("premium");
  expect(await planOfPerson(ben)).toBe("free");
});

test("an event naming no CoinsLite account, or about something else, is acknowledged and ignored", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const stranger = subscriptionEvent("subscription.created", "someone", {
    customer: { id: "cus_2", external_id: null, email: "x@example.com" },
  });
  const order = { type: "order.created", data: { id: "ord_1" } };

  const responses = [await deliver(t, stranger), await deliver(t, order)];

  expect(responses.map((response) => response.status)).toEqual([202, 202]);
  expect(await t.run((ctx) => ctx.db.query("subscriptions").take(5))).toEqual(
    [],
  );
  expect(await planOfPerson(ada)).toBe("free");
});

test("a signed event that isn't a readable subscription is a bad request", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const event = subscriptionEvent("subscription.updated", ada.userId);

  const responses = [
    await deliver(t, { ...event, data: { ...event.data, status: 7 } }),
    await deliver(t, { data: event.data }),
  ];

  expect(responses.map((response) => response.status)).toEqual([400, 400]);
  expect(await planOfPerson(ada)).toBe("free");
});

/** The settings a deployment needs before it can sell Premium. */
function configurePolar(server?: "production") {
  vi.stubEnv("POLAR_ORGANIZATION_TOKEN", "polar_oat_test");
  vi.stubEnv("POLAR_PREMIUM_MONTHLY_PRODUCT_ID", MONTHLY);
  vi.stubEnv("POLAR_PREMIUM_YEARLY_PRODUCT_ID", YEARLY);
  vi.stubEnv("SITE_URL", "https://app.coinslite.test");
  if (server) vi.stubEnv("POLAR_SERVER", server);
}

test("the Premium page prices monthly and yearly in the currency the buyer will pay", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const prices = async (country?: string) =>
    (await ada.as.query(api.billing.status, { country }))?.prices;

  expect(await prices("NO")).toEqual({
    currency: "NOK",
    month: 3900,
    year: 34900,
  });
  expect(await prices("ro")).toEqual({
    currency: "RON",
    month: 1799,
    year: 14999,
  });
  expect(await prices("US")).toEqual({
    currency: "USD",
    month: 399,
    year: 3499,
  });
  // Elsewhere Polar falls back to EUR, whatever the Home currency.
  expect(await prices("DE")).toEqual({
    currency: "EUR",
    month: 349,
    year: 2999,
  });
  expect(await prices("SE")).toMatchObject({ currency: "EUR" });
  // Where the location isn't known (local development), the Home currency guesses it.
  expect(await prices()).toMatchObject({ currency: "NOK" });
  await t.run((ctx) => ctx.db.patch(ada.userId, { homeCurrency: "SEK" }));
  expect(await prices()).toMatchObject({ currency: "EUR" });
});

test("the Premium page says when this deployment can't sell Premium, and when it's in test mode", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const status = () => ada.as.query(api.billing.status, {});

  expect(await status()).toMatchObject({
    plan: "free",
    checkoutAvailable: false,
    testMode: true,
    subscription: null,
  });

  configurePolar();
  expect(await status()).toMatchObject({
    checkoutAvailable: true,
    testMode: true,
  });

  vi.stubEnv("POLAR_SERVER", "production");
  expect(await status()).toMatchObject({
    checkoutAvailable: true,
    testMode: false,
  });
});

test("a Premium member sees their plan and when it renews, or ends once cancelled", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const periodEnd = Date.now() + 365 * DAY;
  await deliver(
    t,
    subscriptionEvent("subscription.created", ada.userId, {
      product_id: YEARLY,
      recurring_interval: "year",
      amount: 34900,
      current_period_end: iso(periodEnd),
    }),
  );

  expect(await ada.as.query(api.billing.status, {})).toMatchObject({
    plan: "premium",
    subscription: {
      interval: "year",
      currency: "NOK",
      amount: 34900,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await deliver(
    t,
    subscriptionEvent("subscription.canceled", ada.userId, {
      product_id: YEARLY,
      recurring_interval: "year",
      amount: 34900,
      current_period_end: iso(periodEnd),
      cancel_at_period_end: true,
      modified_at: iso(Date.now() + 1),
    }),
  );
  expect(await ada.as.query(api.billing.status, {})).toMatchObject({
    plan: "premium",
    subscription: { currentPeriodEnd: periodEnd, cancelAtPeriodEnd: true },
  });
});

test("someone signed out, or not set up yet, has no Premium page to show", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  expect(await t.query(api.billing.status, {})).toBeNull();
  expect(await newcomer.as.query(api.billing.status, {})).toBeNull();
});

/** Polar's API, faked at the network: answers checkouts and subscription updates. */
function fakePolar({ fail = false } = {}) {
  const polar = vi.fn(async (url: string, init?: RequestInit) => {
    if (fail) return new Response('{"detail":"nope"}', { status: 422 });
    const path = new URL(url).pathname;
    if (init?.method === "POST" && path === "/v1/checkouts/") {
      return Response.json(
        { id: "chk_1", url: "https://sandbox.polar.sh/checkout/chk_1" },
        { status: 201 },
      );
    }
    if (init?.method === "PATCH" && path.startsWith("/v1/subscriptions/")) {
      return Response.json({ id: path.split("/").pop(), status: "canceled" });
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", polar);
  return {
    polar,
    request: (n = 0) => {
      const [url, init] = polar.mock.calls[n] as [string, RequestInit];
      return {
        url,
        method: init.method,
        headers: new Headers(init.headers),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      };
    },
  };
}

test("checkout opens Polar for the chosen plan, passing on the buyer's IP so Polar charges in their currency", async () => {
  configurePolar();
  const { polar, request } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const checkout = await ada.as
    .withRequestMetadata({ ip: "84.208.20.110" })
    .action(api.billing.checkout, { interval: "year" });

  expect(checkout).toEqual({ url: "https://sandbox.polar.sh/checkout/chk_1" });
  expect(polar).toHaveBeenCalledTimes(1);
  const sent = request();
  expect(sent.url).toBe("https://sandbox-api.polar.sh/v1/checkouts/");
  expect(sent.method).toBe("POST");
  expect(sent.headers.get("authorization")).toBe("Bearer polar_oat_test");
  expect(sent.body).toMatchObject({
    products: [YEARLY],
    customer_ip_address: "84.208.20.110",
    customer_email: "ada@example.com",
    external_customer_id: ada.userId,
    metadata: { userId: ada.userId },
    success_url:
      "https://app.coinslite.test/settings/billing/confirmation?checkout_id={CHECKOUT_ID}",
    return_url: "https://app.coinslite.test/settings/billing",
  });
});

test("in production, checkout uses Polar's live API", async () => {
  configurePolar("production");
  const { request } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await ada.as.action(api.billing.checkout, { interval: "month" });

  expect(request().url).toBe("https://api.polar.sh/v1/checkouts/");
  expect(request().body).toMatchObject({ products: [MONTHLY] });
});

test("without Polar set up on the deployment, checkout says Premium isn't for sale here", async () => {
  const { polar } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await expect(
    ada.as.action(api.billing.checkout, { interval: "month" }),
  ).rejects.toThrow("BILLING_UNAVAILABLE");
  expect(polar).not.toHaveBeenCalled();
});

test("a Premium member isn't sent to buy Premium again", async () => {
  configurePolar();
  const { polar } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await deliver(t, subscriptionEvent("subscription.created", ada.userId));

  await expect(
    ada.as.action(api.billing.checkout, { interval: "year" }),
  ).rejects.toThrow("ALREADY_PREMIUM");
  expect(polar).not.toHaveBeenCalled();
});

test("checkout is for signed-in people who have finished signing up", async () => {
  configurePolar();
  const { polar } = fakePolar();
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  await expect(
    t.action(api.billing.checkout, { interval: "month" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    newcomer.as.action(api.billing.checkout, { interval: "month" }),
  ).rejects.toThrow("NOT_SET_UP");
  expect(polar).not.toHaveBeenCalled();
});

test("when Polar can't open a checkout, the buyer is told it failed", async () => {
  configurePolar();
  fakePolar({ fail: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await expect(
    ada.as.action(api.billing.checkout, { interval: "month" }),
  ).rejects.toThrow("CHECKOUT_FAILED");
});

test("deleting an account stops its Premium subscription at Polar and removes the subscription link", async () => {
  configurePolar();
  const { polar, request } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await deliver(t, subscriptionEvent("subscription.created", ada.userId));

  await ada.as.action(api.users.deleteCurrentUserAccount, {});

  expect(polar).toHaveBeenCalledTimes(1);
  expect(request()).toMatchObject({
    url: "https://sandbox-api.polar.sh/v1/subscriptions/sub_1",
    method: "PATCH",
    body: { revoke: true },
  });
  expect(await t.run((ctx) => ctx.db.query("subscriptions").take(5))).toEqual(
    [],
  );
  expect(await t.run((ctx) => ctx.db.get(ada.userId))).toBeNull();
});

test("a subscription already set to end needs nothing from Polar when the account is deleted", async () => {
  configurePolar();
  const { polar } = fakePolar();
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await deliver(
    t,
    subscriptionEvent("subscription.canceled", ada.userId, {
      cancel_at_period_end: true,
    }),
  );

  await ada.as.action(api.users.deleteCurrentUserAccount, {});

  expect(polar).not.toHaveBeenCalled();
  expect(await t.run((ctx) => ctx.db.query("subscriptions").take(5))).toEqual(
    [],
  );
});
