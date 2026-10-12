"use client";

import { goTo } from "@/lib/go-to";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useEffect, useRef, useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage, type FormMessageState } from "./auth-panel";
import { TextField } from "./text-field";
import {
  codeInputProps,
  useAuthSchemas,
  useSubmitState,
} from "./use-auth-form";
import { type AuthStepResult, useAuthStep } from "./use-auth-step";

/**
 * "Check your email": verifies an address with the emailed code, then signs in
 * and goes on to `next`. The same code also arrives as a link to the verify page.
 */
export function CodeStep({
  email,
  next,
  description,
  onBack,
}: {
  email: string;
  next: string;
  description?: string;
  onBack: () => void;
}) {
  const t = useI18n();
  const attempt = useAuthStep("password");
  const schemas = useAuthSchemas();
  const [message, setMessage] = useState<FormMessageState>();
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => codeInput.current?.focus(), []);

  const form = useForm({
    defaultValues: { code: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setMessage(undefined);
      const result = await attempt({
        flow: "email-verification",
        email,
        code: value.code.trim(),
      });
      if (result === "signedIn") goTo(next);
      else setMessage({ tone: "error", text: t("auth.code.failed") });
    },
  });
  const { submitted, submitting } = useSubmitState(form);

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
              {...codeInputProps}
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
          <ResendCodeButton
            email={email}
            resend={() =>
              attempt({ flow: "email-verification", email, redirectTo: next })
            }
            onResult={setMessage}
          />
        </div>
      </AuthForm>
    </AuthPanel>
  );
}

/** "Send a new code", reporting whether it went out. */
export function ResendCodeButton({
  email,
  resend,
  onResult,
  isLink = false,
}: {
  email: string;
  resend: () => Promise<AuthStepResult>;
  onResult: (message: FormMessageState) => void;
  isLink?: boolean;
}) {
  const t = useI18n();
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full"
      onClick={async () => {
        onResult(
          (await resend()) === "failed"
            ? { tone: "error", text: t("auth.failedGeneric") }
            : {
                tone: "info",
                text: t(isLink ? "auth.link.resent" : "auth.code.resent", {
                  email,
                }),
              },
        );
      }}
    >
      {t(isLink ? "auth.link.resend" : "auth.code.resend")}
    </Button>
  );
}
