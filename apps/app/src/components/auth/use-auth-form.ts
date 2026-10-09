"use client";

import { useI18n } from "@/locales/client";
import {
  CODE_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@coinslite/backend/convex/accounts/credentials";
import { useMemo } from "react";
import { z } from "zod";

/** Field rules shared by the auth forms, in the current language. They mirror the backend's. */
export function useAuthSchemas() {
  const t = useI18n();
  return useMemo(
    () => ({
      email: z.string().trim().email(t("auth.fields.emailInvalid")),
      password: z.string().min(1, t("auth.fields.passwordRequired")),
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, t("auth.fields.passwordTooShort")),
      code: z
        .string()
        .trim()
        .regex(
          new RegExp(`^\\d{${CODE_LENGTH}}$`),
          t("auth.fields.codeInvalid"),
        ),
    }),
    [t],
  );
}

/** The parts of a TanStack form's state the auth forms show. */
type FormStore = {
  useStore: <T>(
    select: (state: { submissionAttempts: number; isSubmitting: boolean }) => T,
  ) => T;
};

/** Whether to show field errors yet (after the first submit), and whether it's sending now. */
export function useSubmitState(form: FormStore) {
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  return { submitted, submitting };
}

/** The code input's attributes, shared by the verify and reset steps. */
export const codeInputProps = {
  inputMode: "numeric",
  autoComplete: "one-time-code",
  maxLength: CODE_LENGTH,
  className: "font-mono tracking-[0.3em]",
} as const;
