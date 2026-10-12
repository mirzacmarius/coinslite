import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    /** OpenPanel client for usage statistics; unset, nothing is sent. */
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
  },
  // Skipping also skips the defaults above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
