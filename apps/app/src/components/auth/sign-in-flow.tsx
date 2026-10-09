"use client";

import { goTo, nextQuery } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import Link from "next/link";
import { useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { CodeStep } from "./code-step";
import { OtherSignInMethods } from "./other-methods";
import { TextField } from "./text-field";
import { useAuthSchemas, useSubmitState } from "./use-auth-form";
import { usePasswordAuth } from "./use-password-auth";

export function SignInFlow({ next }: { next: string }) {
  const t = useI18n();
  const attempt = usePasswordAuth();
  const schemas = useAuthSchemas();
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
        redirectTo: next,
      });
      if (result === "signedIn") goTo(next);
      else if (result === "codeSent") setUnverifiedEmail(email);
      else setFailed(true);
    },
  });
  const { submitted, submitting } = useSubmitState(form);

  if (unverifiedEmail) {
    return (
      <CodeStep
        email={unverifiedEmail}
        next={next}
        description={t("auth.signIn.verifyToContinue")}
        onBack={() => setUnverifiedEmail(undefined)}
      />
    );
  }

  return (
    <AuthPanel
      title={t("auth.signIn.title")}
      footer={
        <p>
          {t("auth.signIn.noAccount")}{" "}
          <Link href={`/signup${nextQuery(next)}`} className={authLink}>
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
                  href={`/reset${nextQuery(next)}`}
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
      <OtherSignInMethods next={next} />
    </AuthPanel>
  );
}
