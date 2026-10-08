"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useEffect, useRef, useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage } from "./auth-panel";
import { authSchemas } from "./schemas";
import { TextField } from "./text-field";
import type { AuthStepResult } from "./use-password-auth";

/**
 * "Check your email": the 8-digit code sent to verify an address. The same
 * code also arrives as a link, which opens the verify page instead.
 */
export function CodeStep({
  email,
  description,
  verify,
  resend,
  onBack,
}: {
  email: string;
  description?: string;
  verify: (code: string) => Promise<AuthStepResult>;
  resend: () => Promise<AuthStepResult>;
  onBack: () => void;
}) {
  const t = useI18n();
  const schemas = authSchemas({
    emailInvalid: t("auth.fields.emailInvalid"),
    passwordTooShort: t("auth.fields.passwordTooShort"),
    passwordRequired: t("auth.fields.passwordRequired"),
    codeInvalid: t("auth.fields.codeInvalid"),
  });
  const [message, setMessage] = useState<{
    tone: "error" | "info";
    text: string;
  }>();
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => codeInput.current?.focus(), []);

  const form = useForm({
    defaultValues: { code: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setMessage(undefined);
      if ((await verify(value.code.trim())) === "failed") {
        setMessage({ tone: "error", text: t("auth.code.failed") });
      }
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);

  return (
    <AuthPanel
      title={t("auth.code.title")}
      description={
        <>
          {description && <>{description} </>}
          {t("auth.code.description", { email })}
        </>
      }
      footer={
        <button
          type="button"
          onClick={onBack}
          className="self-start hover:text-foreground"
        >
          {t("auth.code.differentEmail")}
        </button>
      }
    >
      <AuthForm form={form}>
        <form.Field name="code" validators={{ onChange: schemas.code }}>
          {(field) => (
            <TextField
              inputRef={codeInput}
              field={field}
              label={t("auth.fields.code")}
              showErrors={submitted}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="font-mono tracking-[0.3em]"
            />
          )}
        </form.Field>
        {message && (
          <FormMessage tone={message.tone}>{message.text}</FormMessage>
        )}
        <div className="flex flex-col gap-2">
          <SubmitButton submitting={submitting}>
            {t("auth.code.submit")}
          </SubmitButton>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              setMessage(
                (await resend()) === "failed"
                  ? { tone: "error", text: t("auth.failedGeneric") }
                  : { tone: "info", text: t("auth.code.resent", { email }) },
              );
            }}
          >
            {t("auth.code.resend")}
          </Button>
        </div>
      </AuthForm>
    </AuthPanel>
  );
}
