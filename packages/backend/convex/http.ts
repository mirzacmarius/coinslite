import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { polarWebhook } from "./billing/webhook";
import { serve as servePhoto } from "./photos/links";

const http = httpRouter();

auth.addHttpRoutes(http);

// Polar's webhook: point the organization's endpoint at <CONVEX_SITE_URL>/polar/events.
http.route({ path: "/polar/events", method: "POST", handler: polarWebhook });

// Item photos, through the signed links their owner's queries hand out.
http.route({ path: "/photos", method: "GET", handler: servePhoto });

export default http;
