"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";
import { CheckboxField, Field } from "@coinslite/ui/field";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { Wallet } from "lucide-react";
import { useId, useMemo } from "react";
import { z } from "zod";
import { authLink } from "./auth-panel";

/** The parts of a TanStack form field these components read. */
type FormField<T> = {
  state: { value: T; meta: { errors: unknown[] } };
  handleChange: (value: T) => void;
};

/** The Home currency pill, with every supported currency named in the current language. */
export function HomeCurrencyField({
  field,
}: { field: FormField<HomeCurrency> }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const id = useId();
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(locale, { type: "currency" });
    return homeCurrencies.map((code) => ({
      value: code,
      label: code,
      hint: names.of(code),
    }));
  }, [locale]);
  return (
    <Field
      id={id}
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
          options={options}
          onChange={field.handleChange}
          noResults={t("auth.noMatches")}
        />
      )}
    </Field>
  );
}

/** The rule for the terms checkbox: it must be ticked. */
export function useAcceptTermsRule() {
  const t = useI18n();
  return useMemo(
    () =>
      z.literal(true, {
        errorMap: () => ({ message: t("auth.signUp.termsRequired") }),
      }),
    [t],
  );
}

/** "I accept the privacy policy and the terms of use", linking both. */
export function AcceptTermsField({
  field,
  showErrors,
  privacyUrl,
  termsUrl,
}: {
  field: FormField<boolean>;
  showErrors: boolean;
  privacyUrl: string;
  termsUrl: string;
}) {
  const t = useI18n();
  const id = useId();
  return (
    <CheckboxField
      id={id}
      checked={field.state.value}
      onCheckedChange={field.handleChange}
      error={
        showErrors && field.state.meta.errors.length > 0
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
  );
}
