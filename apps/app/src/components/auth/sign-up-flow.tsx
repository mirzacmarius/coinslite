"use client";

import { goTo } from "@/lib/go-to";
import { nextQuery } from "@/lib/next-path";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import type { HomeCurrency } from "@coinslite/i18n";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import Link from "next/link";
import { useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { CodeStep } from "./code-step";
import { OtherSignInMethods } from "./other-methods";
import {
  AcceptTermsField,
  HomeCurrencyField,
  useAcceptTermsRule,
} from "./sign-up-fields";
import { TextField } from "./text-field";
import { useAuthSchemas, useSubmitState } from "./use-auth-form";
import { useAuthStep } from "./use-auth-step";

export function SignUpFlow({
  next,
  suggestedCurrency,
}: {
  next: string;
  suggestedCurrency: HomeCurrency;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const attempt = useAuthStep("password");
  const schemas = useAuthSchemas();
  const acceptTermsRule = useAcceptTermsRule();
  const [pendingEmail, setPendingEmail] = useState<string>();
  const [failed, setFailed] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      homeCurrency: suggestedCurrency,
      acceptTerms: false,
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(false);
      const email = normalizeEmail(value.email);
      const result = await attempt({
        flow: "signUp",
        email,
        password: value.password,
        homeCurrency: value.homeCurrency,
        language: locale,
        acceptTerms: String(value.acceptTerms),
        // The emailed link brings the person back here too.
        redirectTo: next,
      });
      if (result === "signedIn") goTo(next);
      else if (result === "codeSent") setPendingEmail(email);
      else setFailed(true);
    },
  });
  const { submitted, submitting } = useSubmitState(form);

  if (pendingEmail) {
    return (
      <CodeStep
        email={pendingEmail}
        next={next}
        onBack={() => setPendingEmail(undefined)}
      />
    );
  }

  return (
    <AuthPanel
      title={t("auth.signUp.title")}
      description={t("auth.signUp.description")}
      footer={
        <p>
          {t("auth.signUp.haveAccount")}{" "}
          <Link href={`/login${nextQuery(next)}`} className={authLink}>
            {t("auth.signIn.submit")}
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
        <form.Field
          name="password"
          validators={{ onChange: schemas.newPassword }}
        >
          {(field) => (
            <TextField
              field={field}
              label={t("auth.fields.password")}
              hint={t("auth.fields.passwordHint")}
              showErrors={submitted}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.Field>
        <form.Field name="homeCurrency">
          {(field) => <HomeCurrencyField field={field} />}
        </form.Field>
        <form.Field
          name="acceptTerms"
          validators={{ onChange: acceptTermsRule }}
        >
          {(field) => <AcceptTermsField field={field} showErrors={submitted} />}
        </form.Field>
        {failed && <FormMessage>{t("auth.signUp.failed")}</FormMessage>}
        <SubmitButton submitting={submitting}>
          {t("auth.signUp.submit")}
        </SubmitButton>
      </AuthForm>
      <OtherSignInMethods next={next} />
    </AuthPanel>
  );
}
