"use client";

import { goTo } from "@/lib/next-path";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/email";
import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import { Checkbox } from "@coinslite/ui/checkbox";
import { Field } from "@coinslite/ui/field";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { CodeStep } from "./code-step";
import { authSchemas } from "./schemas";
import { TextField } from "./text-field";
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
  const ids = { currency: useId(), terms: useId() };
  const schemas = authSchemas({
    emailInvalid: t("auth.fields.emailInvalid"),
    passwordTooShort: t("auth.fields.passwordTooShort"),
    passwordRequired: t("auth.fields.passwordRequired"),
    codeInvalid: t("auth.fields.codeInvalid"),
  });
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
      });
      if (result === "signedIn") goTo(next);
      else if (result === "codeSent") setPendingEmail(email);
      else setFailed(true);
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);

  if (pendingEmail) {
    return (
      <CodeStep
        email={pendingEmail}
        verify={async (code) => {
          const result = await attempt({
            flow: "email-verification",
            email: pendingEmail,
            code,
          });
          if (result === "signedIn") goTo(next);
          return result;
        }}
        resend={() =>
          attempt({ flow: "email-verification", email: pendingEmail })
        }
        onBack={() => setPendingEmail(undefined)}
      />
    );
  }

  const withNext = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthPanel
      title={t("auth.signUp.title")}
      description={t("auth.signUp.description")}
      footer={
        <p>
          {t("auth.signUp.haveAccount")}{" "}
          <Link href={`/login${withNext}`} className={authLink}>
            {t("auth.signIn.submit")}
          </Link>
        </p>
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
              {({ id }) => (
                <PropertyPicker
                  id={id}
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
          {(field) => {
            const showError = submitted && field.state.meta.errors.length > 0;
            return (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={ids.terms}
                    checked={field.state.value}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
                    aria-invalid={showError || undefined}
                    aria-describedby={
                      showError ? `${ids.terms}-error` : undefined
                    }
                    className="mt-0.5"
                  />
                  <label htmlFor={ids.terms} className="text-[13px] leading-5">
                    {t("auth.signUp.acceptTerms", {
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
                  </label>
                </div>
                {showError && (
                  <p
                    id={`${ids.terms}-error`}
                    className="text-xs text-destructive"
                  >
                    {t("auth.signUp.termsRequired")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>
        {failed && <FormMessage>{t("auth.signUp.failed")}</FormMessage>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {t("auth.signUp.submit")}
        </Button>
      </form>
    </AuthPanel>
  );
}
