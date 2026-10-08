"use client";

import { goTo } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/email";
import { Button } from "@coinslite/ui/button";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { takeLinkFragment } from "./link-fragment";
import { authSchemas } from "./schemas";
import { TextField } from "./text-field";
import { usePasswordAuth } from "./use-password-auth";

/** Forgot password: email a code, then choose a new password with it. */
export function ResetFlow({ next }: { next: string }) {
  const t = useI18n();
  const attempt = usePasswordAuth();
  const schemas = authSchemas({
    emailInvalid: t("auth.fields.emailInvalid"),
    passwordTooShort: t("auth.fields.passwordTooShort"),
    passwordRequired: t("auth.fields.passwordRequired"),
    codeInvalid: t("auth.fields.codeInvalid"),
  });
  const [step, setStep] = useState<{ email: string; code: string } | null>(
    null,
  );

  // The emailed link carries the email and code; go straight to the new password.
  useEffect(() => {
    const link = takeLinkFragment();
    if (link) setStep(link);
  }, []);

  return step ? (
    <NewPasswordStep
      key={step.email}
      email={step.email}
      code={step.code}
      schemas={schemas}
      submit={async ({ code, newPassword }) => {
        const result = await attempt({
          flow: "reset-verification",
          email: step.email,
          code,
          newPassword,
        });
        if (result === "signedIn") goTo(next);
        return result;
      }}
      resend={() => attempt({ flow: "reset", email: step.email })}
    />
  ) : (
    <RequestStep
      schemas={schemas}
      submit={async (email) => {
        // Whether or not the address has an account, the next step looks the same.
        await attempt({ flow: "reset", email });
        setStep({ email, code: "" });
      }}
    />
  );
}

type Schemas = ReturnType<typeof authSchemas>;

function RequestStep({
  schemas,
  submit,
}: {
  schemas: Schemas;
  submit: (email: string) => Promise<void>;
}) {
  const t = useI18n();
  const form = useForm({
    defaultValues: { email: "" },
    validatorAdapter: zodValidator(),
    onSubmit: ({ value }) => submit(normalizeEmail(value.email)),
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  return (
    <AuthPanel
      title={t("auth.reset.title")}
      description={t("auth.reset.description")}
      footer={
        <Link href="/login" className={authLink}>
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email" validators={{ onChange: schemas.email }}>
          {(field) => (
            <TextField
              field={field}
              label={t("auth.fields.email")}
              showErrors={submitted}
              type="email"
              autoComplete="email"
            />
          )}
        </form.Field>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {t("auth.reset.sendCode")}
        </Button>
      </form>
    </AuthPanel>
  );
}

function NewPasswordStep({
  email,
  code,
  schemas,
  submit,
  resend,
}: {
  email: string;
  code: string;
  schemas: Schemas;
  submit: (values: { code: string; newPassword: string }) => Promise<string>;
  resend: () => Promise<string>;
}) {
  const t = useI18n();
  const [message, setMessage] = useState<
    { tone: "error" | "info"; text: string } | undefined
  >(
    code
      ? undefined
      : { tone: "info", text: t("auth.reset.codeSent", { email }) },
  );
  const form = useForm({
    defaultValues: { code, newPassword: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setMessage(undefined);
      const result = await submit({
        code: value.code.trim(),
        newPassword: value.newPassword,
      });
      if (result === "failed")
        setMessage({ tone: "error", text: t("auth.reset.failed") });
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  return (
    <AuthPanel
      title={t("auth.reset.newPasswordTitle")}
      description={email}
      footer={
        <Link href="/login" className={authLink}>
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="code" validators={{ onChange: schemas.code }}>
          {(field) => (
            <TextField
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
        <form.Field
          name="newPassword"
          validators={{ onChange: schemas.newPassword }}
        >
          {(field) => (
            <TextField
              field={field}
              label={t("auth.fields.newPassword")}
              hint={t("auth.fields.passwordHint")}
              showErrors={submitted}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.Field>
        {message && (
          <FormMessage tone={message.tone}>{message.text}</FormMessage>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {t("auth.reset.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await resend();
              setMessage({
                tone: "info",
                text: t("auth.code.resent", { email }),
              });
            }}
          >
            {t("auth.code.resend")}
          </Button>
        </div>
      </form>
    </AuthPanel>
  );
}
