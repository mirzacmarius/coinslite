"use client";

import { goTo } from "@/lib/go-to";
import { useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import {
  AuthPanel,
  FormMessage,
  type FormMessageState,
  authLink,
} from "./auth-panel";
import { ResendCodeButton } from "./code-step";
import { takeLinkFragment } from "./link-fragment";
import { TextField } from "./text-field";
import {
  codeInputProps,
  useAuthSchemas,
  useSubmitState,
} from "./use-auth-form";
import { useAuthStep } from "./use-auth-step";

/** Forgot password: email a code, then choose a new password with it. */
export function ResetFlow({ next }: { next: string }) {
  const [step, setStep] = useState<{
    email: string;
    code: string;
    next?: string;
  } | null>(null);

  // The emailed link carries the email and code; go straight to the new password.
  // It may also be pasted into this tab, which only changes the fragment.
  useEffect(() => {
    const openLink = () => {
      const link = takeLinkFragment();
      if (link) setStep(link);
    };
    openLink();
    window.addEventListener("hashchange", openLink);
    return () => window.removeEventListener("hashchange", openLink);
  }, []);

  return step ? (
    <NewPasswordStep
      key={`${step.email} ${step.code}`}
      email={step.email}
      code={step.code}
      next={step.next ?? next}
    />
  ) : (
    <RequestStep next={next} onSent={(email) => setStep({ email, code: "" })} />
  );
}

function RequestStep({
  next,
  onSent,
}: { next: string; onSent: (email: string) => void }) {
  const t = useI18n();
  const attempt = useAuthStep("password");
  const schemas = useAuthSchemas();
  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      const email = normalizeEmail(value.email);
      // Whether or not the address has an account, the next step looks the same.
      await attempt({ flow: "reset", email, redirectTo: next });
      onSent(email);
    },
  });
  const { submitted, submitting } = useSubmitState(form);
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
      <AuthForm form={form}>
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
        <SubmitButton submitting={submitting}>
          {t("auth.reset.sendCode")}
        </SubmitButton>
      </AuthForm>
    </AuthPanel>
  );
}

function NewPasswordStep({
  email,
  code,
  next,
}: { email: string; code: string; next: string }) {
  const t = useI18n();
  const attempt = useAuthStep("password");
  const schemas = useAuthSchemas();
  const [message, setMessage] = useState<FormMessageState | undefined>(
    code
      ? undefined
      : { tone: "info", text: t("auth.reset.codeSent", { email }) },
  );
  const form = useForm({
    defaultValues: { code, newPassword: "" },
    onSubmit: async ({ value }) => {
      setMessage(undefined);
      const result = await attempt({
        flow: "reset-verification",
        email,
        code: value.code.trim(),
        newPassword: value.newPassword,
      });
      if (result === "signedIn") goTo(next);
      else setMessage({ tone: "error", text: t("auth.reset.failed") });
    },
  });
  const { submitted, submitting } = useSubmitState(form);
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
      <AuthForm form={form}>
        <form.Field name="code" validators={{ onChange: schemas.code }}>
          {(field) => (
            <TextField
              field={field}
              label={t("auth.fields.code")}
              showErrors={submitted}
              {...codeInputProps}
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
          <SubmitButton submitting={submitting}>
            {t("auth.reset.submit")}
          </SubmitButton>
          <ResendCodeButton
            email={email}
            resend={() => attempt({ flow: "reset", email, redirectTo: next })}
            onResult={setMessage}
          />
        </div>
      </AuthForm>
    </AuthPanel>
  );
}
