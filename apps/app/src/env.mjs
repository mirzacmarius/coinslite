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
  },
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    PORT: process.env.PORT,
    VERCEL_URL: process.env.VERCEL_URL,
  },
  // Skipping also skips the defaults above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
