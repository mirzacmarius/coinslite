"use client";

import { goTo, nextQuery } from "@/lib/next-path";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";
import { CheckboxField, Field } from "@coinslite/ui/field";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { CodeStep } from "./code-step";
import { TextField } from "./text-field";
import { useAuthSchemas, useSubmitState } from "./use-auth-form";
import { usePasswordAuth } from "./use-password-auth";

export function SignUpFlow({
  next,
  suggestedCurrency,
  privacyUrl,
  termsUrl,
}: {
  next: string;
  suggestedCurrency: HomeCurrency;
  privacyUrl: string;
  termsUrl: string;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const attempt = usePasswordAuth();
  const schemas = useAuthSchemas();
  const ids = { currency: useId(), terms: useId() };
  const currencyOptions = useMemo(() => {
    const names = new Intl.DisplayNames(locale, { type: "currency" });
    return homeCurrencies.map((code) => ({
      value: code,
      label: code,
      hint: names.of(code),
    }));
  }, [locale]);
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
          {(field) => (
            <Field
              id={ids.currency}
              label={t("auth.fields.homeCurrency")}
              hint={t("auth.signUp.homeCurrencyHint")}
            >
              {(control) => (
                <PropertyPicker
                  id={control.id}
                  aria-describedby={control["aria-describedby"]}
                  icon={Wallet}
                  label={t("auth.fields.homeCurrency")}
                  value={field.state.value}
                  options={currencyOptions}
                  onChange={field.handleChange}
                  noResults={t("auth.noMatches")}
                />
              )}
            </Field>
          )}
        </form.Field>
        <form.Field
          name="acceptTerms"
          validators={{
            onChange: z.literal(true, {
              errorMap: () => ({ message: t("auth.signUp.termsRequired") }),
            }),
          }}
        >
          {(field) => (
            <CheckboxField
              id={ids.terms}
              checked={field.state.value}
              onCheckedChange={field.handleChange}
              error={
                submitted && field.state.meta.errors.length > 0
                  ? t("auth.signUp.termsRequired")
                  : undefined
              }
              label={t("auth.signUp.acceptTerms", {
                privacy: (
                  <a
                    href={privacyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={authLink}
                  >
                    {t("auth.signUp.privacyPolicy")}
                  </a>
                ),
                terms: (
                  <a
                    href={termsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={authLink}
                  >
                    {t("auth.signUp.termsOfUse")}
                  </a>
                ),
              })}
            />
          )}
        </form.Field>
        {failed && <FormMessage>{t("auth.signUp.failed")}</FormMessage>}
        <SubmitButton submitting={submitting}>
          {t("auth.signUp.submit")}
        </SubmitButton>
      </AuthForm>
    </AuthPanel>
  );
}
