import { sentryOptions } from "@/lib/sentry";
import * as Sentry from "@sentry/nextjs";

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
