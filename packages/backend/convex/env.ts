import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    CONVEX_SITE_URL: z.string().url(),
    RESEND_API_KEY: z.optional(z.string().min(1)),
    RESEND_SENDER_EMAIL_AUTH: z.optional(z.string().email()),
  },
  runtimeEnv: {
    CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_SENDER_EMAIL_AUTH: process.env.RESEND_SENDER_EMAIL_AUTH,
  },
  skipValidation: !process.env.VALIDATE_ENV,
});
