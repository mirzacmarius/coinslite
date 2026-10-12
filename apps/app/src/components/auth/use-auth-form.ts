"use client";

import { useI18n } from "@/locales/client";
import { CODE_LENGTH } from "@coinslite/backend/convex/accounts/credentials";
import { useSelector } from "@tanstack/react-form";
import { useMemo } from "react";
import { authRules } from "./auth-rules";

/** Field rules shared by the auth forms, in the current language (auth-rules.ts). */
export function useAuthSchemas() {
  const t = useI18n();
  return useMemo(() => authRules((key) => t(key)), [t]);
}

/** A TanStack form's store, as far as a component reads `State` from it. */
export type FormStore<State> = {
  store: {
    get: () => State;
    subscribe: (listener: (state: State) => void) => {
      unsubscribe: () => void;
    };
  };
};

/** Whether to show field errors yet (after the first submit), and whether it's sending now. */
export function useSubmitState(
  form: FormStore<{ submissionAttempts: number; isSubmitting: boolean }>,
) {
  const submitted = useSelector(
    form.store,
    (state) => state.submissionAttempts > 0,
  );
  const submitting = useSelector(form.store, (state) => state.isSubmitting);
  return { submitted, submitting };
}

/** The code input's attributes, shared by the verify and reset steps. */
export const codeInputProps = {
  inputMode: "numeric",
  autoComplete: "one-time-code",
  maxLength: CODE_LENGTH,
  className: "font-mono tracking-[0.3em]",
} as const;
