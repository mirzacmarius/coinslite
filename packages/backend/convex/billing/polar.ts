import { env } from "../_generated/server";
import { type BillingInterval, chargesAgain } from "./rules";

/**
 * Polar's REST API, the few calls CoinsLite makes. Plain fetch rather than an
 * SDK: Polar's API keeps growing (statuses, currencies), and strict client-side
 * schemas would turn every addition into a failed call.
 */

export const isPolarSandbox = () => env.POLAR_SERVER !== "production";

/** The Premium products checkout sells, or null until both are configured. */
export function premiumProducts(): Record<BillingInterval, string> | null {
  const month = env.POLAR_PREMIUM_MONTHLY_PRODUCT_ID;
  const year = env.POLAR_PREMIUM_YEARLY_PRODUCT_ID;
  return month && year ? { month, year } : null;
}

/**
 * Whether a subscription to this Polar product is Premium: only the
 * configured monthly and yearly Premium products are, whatever else the
 * organization sells.
 */
export function isPremiumProduct(productId: string) {
  return (
    productId !== "" &&
    (productId === env.POLAR_PREMIUM_MONTHLY_PRODUCT_ID ||
      productId === env.POLAR_PREMIUM_YEARLY_PRODUCT_ID)
  );
}

export class PolarError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    request: string,
  ) {
    super(`Polar answered ${status} to ${request}: ${detail}`);
    this.name = "PolarError";
  }
}

/** A client for Polar's API, or null on a deployment without an organization token. */
export function polarApi() {
  const token = env.POLAR_ORGANIZATION_TOKEN;
  if (!token) return null;
  const base = isPolarSandbox()
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";

  async function call(method: string, path: string, body?: unknown) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new PolarError(
        response.status,
        await response.text(),
        `${method} ${path}`,
      );
    }
    return (await response.json()) as unknown;
  }

  return {
    /**
     * Opens a checkout and returns the page to send the buyer to. Polar picks
     * the currency from `customerIp` (the buyer's location), falling back to
     * the organization's default.
     */
    async createCheckout(checkout: {
      productId: string;
      userId: string;
      email?: string;
      customerIp?: string;
      successUrl: string;
      returnUrl: string;
    }) {
      const created = await call("POST", "/checkouts/", {
        products: [checkout.productId],
        external_customer_id: checkout.userId,
        customer_email: checkout.email,
        customer_ip_address: checkout.customerIp,
        // Copied onto the subscription, so its events name the buyer.
        metadata: { userId: checkout.userId },
        success_url: checkout.successUrl,
        return_url: checkout.returnUrl,
      });
      const { url, expires_at } = (created ?? {}) as {
        url?: unknown;
        expires_at?: unknown;
      };
      if (typeof url !== "string") {
        throw new PolarError(200, "no checkout url", "POST /checkouts/");
      }
      const expiresAt =
        typeof expires_at === "string" ? Date.parse(expires_at) : Number.NaN;
      return {
        url,
        expiresAt: Number.isNaN(expiresAt) ? undefined : expiresAt,
      };
    },

    /**
     * Opens Polar's customer portal for one customer, where they change or
     * cancel their subscription, and returns its page. With `returnUrl` the
     * portal shows a way back.
     */
    async createCustomerPortal(session: {
      customerId: string;
      returnUrl?: string;
    }) {
      const created = await call("POST", "/customer-sessions/", {
        customer_id: session.customerId,
        return_url: session.returnUrl,
      });
      const url = (created as { customer_portal_url?: unknown } | null)
        ?.customer_portal_url;
      if (typeof url !== "string") {
        throw new PolarError(
          200,
          "no customer portal url",
          "POST /customer-sessions/",
        );
      }
      return url;
    },

    /**
     * The ids of the subscriptions Polar would charge again for the customer
     * checkout created for this CoinsLite user (its external id), whether or
     * not their events have reached CoinsLite yet.
     */
    async subscriptionsThatCharge(userId: string) {
      const query = new URLSearchParams({
        external_customer_id: userId,
        limit: "100",
      });
      const page = await call("GET", `/subscriptions/?${query}`);
      const items = (page as { items?: unknown } | null)?.items;
      if (!Array.isArray(items)) {
        throw new PolarError(
          200,
          "no subscription list",
          "GET /subscriptions/",
        );
      }
      return (items as Record<string, unknown>[])
        .filter(
          (listed) =>
            typeof listed.id === "string" &&
            chargesAgain({
              status: String(listed.status),
              cancelAtPeriodEnd: listed.cancel_at_period_end === true,
              endedAt: listed.ended_at ? 0 : undefined,
            }),
        )
        .map((listed) => listed.id as string);
    },

    /** Ends a subscription now, without charging again. */
    async revokeSubscription(polarId: string) {
      await call("PATCH", `/subscriptions/${encodeURIComponent(polarId)}`, {
        revoke: true,
      });
    },

    /** The organization's products that aren't archived (one page is plenty here). */
    async listProducts() {
      const page = await call("GET", "/products/?is_archived=false&limit=100");
      const items = (page as { items?: unknown } | null)?.items;
      return Array.isArray(items)
        ? (items as {
            id: string;
            recurring_interval?: string | null;
            metadata?: Record<string, unknown>;
          }[])
        : [];
    },

    async createProduct(product: Record<string, unknown>) {
      return (await call("POST", "/products/", product)) as { id: string };
    },
  };
}
