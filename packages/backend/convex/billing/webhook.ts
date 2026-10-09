import { Webhook } from "standardwebhooks";
import { internal } from "../_generated/api";
import { env, httpAction } from "../_generated/server";

/**
 * Polar's events, at POST /polar/events. Only signed events are read; the
 * subscription ones update the buyer's subscription state (billing.ts) and
 * everything else is acknowledged and ignored.
 */
export const polarWebhook = httpAction(async (ctx, request) => {
  const secret = env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "POLAR_WEBHOOK_SECRET isn't set, so Polar's events are refused",
    );
    return new Response("Webhook secret not configured", { status: 503 });
  }
  const body = await request.text();
  if (!isSignedByPolar(body, request.headers, secret)) {
    return new Response("Invalid signature", { status: 403 });
  }
  const event = parseJson(body);
  if (!isRecord(event) || typeof event.type !== "string") {
    return new Response("Not a Polar event", { status: 400 });
  }
  if (!subscriptionEvents.has(event.type)) {
    return new Response(null, { status: 202 });
  }
  const subscription = reportedSubscription(event.data);
  if (!subscription) {
    return new Response("Not a subscription", { status: 400 });
  }
  await ctx.runMutation(internal.billing.recordSubscription, subscription);
  return new Response(null, { status: 202 });
});

/** The events that carry a subscription's new state. */
const subscriptionEvents = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
]);

/**
 * Whether Polar signed `body` with `secret` (Standard Webhooks: an HMAC of
 * id, timestamp and body, sent less than five minutes ago). Polar keys the
 * HMAC with the secret's own bytes; a secret in Standard Webhooks' base64
 * form ("whsec_…") is accepted as well.
 */
function isSignedByPolar(body: string, headers: Headers, secret: string) {
  const signed = {
    "webhook-id": headers.get("webhook-id") ?? "",
    "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
    "webhook-signature": headers.get("webhook-signature") ?? "",
  };
  const verifiers = [new Webhook(secret, { format: "raw" })];
  try {
    verifiers.push(new Webhook(secret));
  } catch {
    // Not base64: the raw form is the only one.
  }
  return verifiers.some((verifier) => {
    try {
      verifier.verify(body, signed);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * The fields of a Polar subscription that billing keeps, or null when `data`
 * isn't one. `buyer` lists the CoinsLite user ids it may name: checkout puts
 * the buyer's id in the metadata and on the customer (external id).
 */
function reportedSubscription(data: unknown) {
  if (!isRecord(data)) return null;
  const { id, status, customer_id, product_id, cancel_at_period_end } = data;
  if (
    typeof id !== "string" ||
    typeof status !== "string" ||
    typeof customer_id !== "string" ||
    typeof product_id !== "string" ||
    typeof cancel_at_period_end !== "boolean"
  ) {
    return null;
  }
  const modifiedAt = time(data.modified_at) ?? time(data.created_at);
  if (modifiedAt === undefined) return null;
  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const customer = isRecord(data.customer) ? data.customer : {};
  const buyer = [metadata.userId, customer.external_id].filter(
    (ref): ref is string => typeof ref === "string" && ref !== "",
  );
  return {
    polarId: id,
    polarCustomerId: customer_id,
    productId: product_id,
    status,
    interval:
      typeof data.recurring_interval === "string"
        ? data.recurring_interval
        : "",
    currency:
      typeof data.currency === "string" ? data.currency.toUpperCase() : "",
    amount:
      typeof data.amount === "number" && Number.isSafeInteger(data.amount)
        ? data.amount
        : 0,
    currentPeriodEnd: time(data.current_period_end),
    cancelAtPeriodEnd: cancel_at_period_end,
    endedAt: time(data.ended_at),
    modifiedAt,
    buyer,
  };
}

/** An ISO timestamp as ms; undefined when absent or unreadable. */
function time(value: unknown) {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
