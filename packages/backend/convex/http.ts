import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { polarWebhook } from "./billing/webhook";

const http = httpRouter();

auth.addHttpRoutes(http);

// Polar's webhook: point the organization's endpoint at <CONVEX_SITE_URL>/polar/events.
http.route({ path: "/polar/events", method: "POST", handler: polarWebhook });

export default http;
