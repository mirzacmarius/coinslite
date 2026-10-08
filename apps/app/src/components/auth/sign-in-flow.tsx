"use client";

import { goTo } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/email";
import { Button } from "@coinslite/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import Link from "next/link";
import { useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { CodeStep } from "./code-step";
import { authSchemas } from "./schemas";
import { TextField } from "./text-field";
import { usePasswordAuth } from "./use-password-auth";

export function SignInFlow({ next }: { next: string }) {
  const t = useI18n();
  const attempt = usePasswordAuth();
  const { signIn } = useAuthActions();
  const schemas = authSchemas({
    emailInvalid: t("auth.fields.emailInvalid"),
    passwordTooShort: t("auth.fields.passwordTooShort"),
    passwordRequired: t("auth.fields.passwordRequired"),
    codeInvalid: t("auth.fields.codeInvalid"),
  });
  // An account whose email isn't verified yet gets a code instead of a session.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>();
  const [failed, setFailed] = useState(false);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(false);
      const email = normalizeEmail(value.email);
      const result = await attempt({
        flow: "signIn",
        email,
        password: value.password,
      });
      if (result === "signedIn") goTo(next);
      else if (result === "codeSent") setUnverifiedEmail(email);
      else setFailed(true);
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);

  if (unverifiedEmail) {
    return (
      <CodeStep
        email={unverifiedEmail}
        description={t("auth.signIn.verifyToContinue")}
        verify={async (code) => {
          const result = await attempt({
            flow: "email-verification",
            email: unverifiedEmail,
            code,
          });
          if (result === "signedIn") goTo(next);
          return result;
        }}
        resend={() =>
          attempt({ flow: "email-verification", email: unverifiedEmail })
        }
        onBack={() => setUnverifiedEmail(undefined)}
      />
    );
  }

  const withNext = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthPanel
      title={t("auth.signIn.title")}
      footer={
        <p>
          {t("auth.signIn.noAccount")}{" "}
          <Link href={`/signup${withNext}`} className={authLink}>
            {t("auth.signIn.createAccount")}
          </Link>
        </p>
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
        <form.Field name="password" validators={{ onChange: schemas.password }}>
          {(field) => (
            <TextField
              field={field}
              label={t("auth.fields.password")}
              showErrors={submitted}
              type="password"
              autoComplete="current-password"
              labelAction={
                <Link
                  href={`/reset${withNext}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("auth.signIn.forgotPassword")}
                </Link>
              }
            />
          )}
        </form.Field>
        {failed && <FormMessage>{t("auth.signIn.failed")}</FormMessage>}
        <SubmitButton submitting={submitting}>
          {t("auth.signIn.submit")}
        </SubmitButton>
      </AuthForm>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void signIn("google", { redirectTo: next })}
      >
        {t("auth.continueWithGoogle")}
      </Button>
    </AuthPanel>
  );
}
