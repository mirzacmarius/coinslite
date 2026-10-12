import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((v) => (v ? `https://${v}` : undefined)),
    PORT: z.coerce.number().default(3000),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string(),
    /** The marketing site, which hosts the privacy policy and terms of use. */
    NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:3001"),
    /** OpenPanel client for usage statistics; unset, nothing is sent. */
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID: z.string().optional(),
    /** Where error reports go (lib/sentry.ts); unset, nothing is sent. */
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    PORT: process.env.PORT,
    VERCEL_URL: process.env.VERCEL_URL,
  },
  // Skipping also skips the defaults above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
