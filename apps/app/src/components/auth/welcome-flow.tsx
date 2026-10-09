"use client";

import { goTo } from "@/lib/next-path";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { type HomeCurrency, isHomeCurrency } from "@coinslite/i18n";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import { AuthPanel, AuthPanelSkeleton, FormMessage } from "./auth-panel";
import {
  AcceptTermsField,
  HomeCurrencyField,
  useAcceptTermsRule,
} from "./sign-up-fields";
import { useSubmitState } from "./use-auth-form";

/**
 * The last step of signing up with Google or a sign-in link: the Home currency
 * and the terms, which a password sign-up chooses on the form. Anyone who has
 * already done this goes straight on.
 */
export function WelcomeFlow({
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
  const user = useQuery(api.users.getUser);
  const done = user?.termsAcceptedAt !== undefined;
  useEffect(() => {
    if (done) goTo(next);
  }, [done, next]);

  if (!user || done) return <AuthPanelSkeleton />;
  return (
    <WelcomeForm
      email={user.email ?? ""}
      next={next}
      homeCurrency={
        isHomeCurrency(user.homeCurrency)
          ? user.homeCurrency
          : suggestedCurrency
      }
      privacyUrl={privacyUrl}
      termsUrl={termsUrl}
    />
  );
}

function WelcomeForm({
  email,
  next,
  homeCurrency,
  privacyUrl,
  termsUrl,
}: {
  email: string;
  next: string;
  homeCurrency: HomeCurrency;
  privacyUrl: string;
  termsUrl: string;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const completeSignUp = useMutation(api.accounts.profile.completeSignUp);
  const acceptTermsRule = useAcceptTermsRule();
  const [failed, setFailed] = useState(false);

  const form = useForm({
    defaultValues: { homeCurrency, acceptTerms: false },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(false);
      try {
        await completeSignUp({
          homeCurrency: value.homeCurrency,
          language: locale,
          acceptTerms: true,
        });
        goTo(next);
      } catch {
        setFailed(true);
      }
    },
  });
  const { submitted, submitting } = useSubmitState(form);

  return (
    <AuthPanel
      title={t("auth.welcome.title")}
      description={t("auth.welcome.description", { email })}
    >
      <AuthForm form={form}>
        <form.Field name="homeCurrency">
          {(field) => <HomeCurrencyField field={field} />}
        </form.Field>
        <form.Field
          name="acceptTerms"
          validators={{ onChange: acceptTermsRule }}
        >
          {(field) => (
            <AcceptTermsField
              field={field}
              showErrors={submitted}
              privacyUrl={privacyUrl}
              termsUrl={termsUrl}
            />
          )}
        </form.Field>
        {failed && <FormMessage>{t("auth.failedGeneric")}</FormMessage>}
        <SubmitButton submitting={submitting}>
          {t("auth.welcome.submit")}
        </SubmitButton>
      </AuthForm>
    </AuthPanel>
  );
}
