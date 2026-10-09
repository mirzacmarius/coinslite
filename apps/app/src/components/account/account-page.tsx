"use client";

import {
  PlanLink,
  SubscriptionSummary,
} from "@/components/billing/account-plan";
import { InsuranceReportLink } from "@/components/insurance-report/insurance-report-link";
import { PhoneAccountLinks } from "@/components/shell/phone-account-links";
import { useSignOut } from "@/components/sign-out";
import { UpdatesLink } from "@/components/updates/updates-link";
import { submitForm } from "@/lib/submit-form";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { contactLimits } from "@coinslite/backend/convex/account/rules";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { type CountryCode, countryCodes, formatCountry } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Globe, Loader2 } from "lucide-react";
import type * as React from "react";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { HomeCurrencySetting } from "./home-currency-setting";
import { LanguagePicker } from "./language-picker";
import { SendFeedback } from "./send-feedback";

type Account = NonNullable<ReturnType<typeof useAccount>>;
const useAccount = () => useQuery(api.account.get);

/** Account: who you are and your plan, contact details, preferences, email, and leaving. */
export function AccountPage() {
  const t = useI18n();
  const account = useAccount();
  if (!account)
    return (
      <div
        className="h-40 animate-pulse rounded-lg bg-muted"
        aria-hidden="true"
      />
    );
  return (
    <>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">
            {account.displayName ?? account.email}
          </h2>
          <Badge>
            {account.plan === "premium"
              ? t("billing.premium")
              : t("account.freePlan")}
          </Badge>
        </div>
        {account.displayName && (
          <p className="text-[13px] text-muted-foreground">{account.email}</p>
        )}
        <SubscriptionSummary />
      </header>
      <PlanLink plan={account.plan} />
      <PhoneAccountLinks />
      <UpdatesLink />
      <InsuranceReportLink premium={account.plan === "premium"} />
      <ContactSection account={account} />
      <PreferencesSection account={account} />
      <EmailSection account={account} />
      <FeedbackSection />
      <LeaveSection />
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="text-sm font-medium">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ContactSection({ account }: { account: Account }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const updateContact = useMutation(api.account.updateContact);
  const [failed, setFailed] = useState(false);
  const countryOptions = useMemo(
    () =>
      countryCodes
        .map((code) => ({ value: code, label: formatCountry(code, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );
  const form = useForm({
    defaultValues: {
      displayName: account.displayName ?? "",
      fullName: account.fullName ?? "",
      streetAddress: account.streetAddress ?? "",
      postalCode: account.postalCode ?? "",
      city: account.city ?? "",
      country: account.country as CountryCode | undefined,
      contactPhone: account.contactPhone ?? "",
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFailed(false);
      try {
        await updateContact(value);
        toast.success(t("account.contact.saved"));
      } catch {
        setFailed(true);
      }
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  const text = (
    name:
      | "displayName"
      | "fullName"
      | "streetAddress"
      | "postalCode"
      | "city"
      | "contactPhone",
    label: string,
    options: {
      rule?: z.ZodTypeAny;
      className?: string;
      autoComplete?: string;
      type?: string;
    } = {},
  ) => (
    <form.Field
      name={name}
      validators={options.rule ? { onChange: options.rule } : undefined}
    >
      {(field) => (
        <Field
          id={`account-${name}`}
          label={label}
          error={errorOf(field.state.meta.errors)}
          className={options.className}
        >
          {(control) => (
            <Input
              {...control}
              type={options.type}
              autoComplete={options.autoComplete}
              maxLength={contactLimits[name]}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );

  return (
    <Section
      title={t("account.contact.title")}
      description={t("account.contact.description")}
    >
      <form
        method="post"
        noValidate
        className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm(form);
        }}
      >
        {text("displayName", t("account.contact.displayName"), {
          rule: z
            .string()
            .trim()
            .min(1, t("account.contact.displayNameRequired")),
          autoComplete: "nickname",
        })}
        {text("fullName", t("account.contact.fullName"), {
          autoComplete: "name",
        })}
        {text("streetAddress", t("account.contact.streetAddress"), {
          className: "sm:col-span-2",
          autoComplete: "street-address",
        })}
        {text("postalCode", t("account.contact.postalCode"), {
          autoComplete: "postal-code",
        })}
        {text("city", t("account.contact.city"), {
          autoComplete: "address-level2",
        })}
        <form.Field name="country">
          {(field) => (
            <Field id="account-country" label={t("account.contact.country")}>
              {(control) => (
                <PropertyPicker
                  id={control.id}
                  icon={Globe}
                  label={t("account.contact.country")}
                  placeholder={t("account.contact.setCountry")}
                  value={field.state.value}
                  options={countryOptions}
                  onChange={field.handleChange}
                  onClear={() => field.handleChange(undefined)}
                  clearLabel={t("account.contact.noCountry")}
                  noResults={t("items.noMatches")}
                />
              )}
            </Field>
          )}
        </form.Field>
        {text("contactPhone", t("account.contact.phone"), {
          rule: z
            .string()
            .refine(
              (phone) =>
                !phone.trim() || /^\+?[0-9][0-9 ()./-]*$/.test(phone.trim()),
              t("account.contact.invalidPhone"),
            ),
          autoComplete: "tel",
          type: "tel",
        })}
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <p role="alert" className="text-xs text-destructive">
            {failed && t("account.contact.failed")}
          </p>
          <Button type="submit" disabled={submitting}>
            {submitting && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {t("account.contact.save")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PreferencesSection({ account }: { account: Account }) {
  const t = useI18n();
  const currencyHintId = useId();
  return (
    <Section title={t("account.preferences.title")}>
      <div className="grid grid-cols-[140px_1fr] items-center gap-x-3 gap-y-3 text-[13px]">
        <span className="text-xs text-muted-foreground">
          {t("account.preferences.language")}
        </span>
        <div>
          <LanguagePicker />
        </div>
        <span className="text-xs text-muted-foreground">
          {t("account.preferences.homeCurrency")}
        </span>
        <div className="flex flex-col gap-1">
          <HomeCurrencySetting
            current={account.homeCurrency}
            hintId={currencyHintId}
          />
          <span id={currencyHintId} className="text-xs text-muted-foreground">
            {t("homeCurrency.hint")}
          </span>
        </div>
      </div>
    </Section>
  );
}

const emailErrorKeys = {
  INVALID_EMAIL: "account.email.invalid",
  SAME_EMAIL: "account.email.same",
  SIGN_IN_AGAIN: "account.email.signInAgain",
  TOO_MANY_REQUESTS: "account.email.tooMany",
} as const;

function EmailSection({ account }: { account: Account }) {
  const t = useI18n();
  const requestEmailChange = useMutation(api.account.requestEmailChange);
  const signOut = useSignOut();
  const [error, setError] = useState<string>();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const form = useForm({
    defaultValues: { newEmail: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setError(undefined);
      setNeedsSignIn(false);
      try {
        await requestEmailChange({ newEmail: normalizeEmail(value.newEmail) });
        form.reset();
      } catch (failure) {
        const code = failure instanceof ConvexError ? String(failure.data) : "";
        setNeedsSignIn(code === "SIGN_IN_AGAIN");
        setError(
          t(
            code in emailErrorKeys
              ? emailErrorKeys[code as keyof typeof emailErrorKeys]
              : "account.email.failed",
          ),
        );
      }
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);

  return (
    <Section
      title={t("account.email.title")}
      description={t("account.email.current", { email: account.email ?? "" })}
    >
      {account.pendingEmail && (
        <p
          role="status"
          className="rounded-md border bg-muted px-3 py-2 text-xs"
        >
          {t("account.email.sent", { email: account.pendingEmail })}
        </p>
      )}
      <form
        method="post"
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm(form);
        }}
      >
        <form.Field
          name="newEmail"
          validators={{
            onChange: z.string().trim().email(t("account.email.invalid")),
          }}
        >
          {(field) => (
            <Field
              id="account-new-email"
              label={t("account.email.newEmail")}
              error={
                (submitted &&
                  field.state.meta.errors
                    .filter((e) => typeof e === "string")
                    .join(" ")) ||
                error
              }
              className="flex-1"
            >
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </Field>
          )}
        </form.Field>
        <Button
          type="submit"
          variant="outline"
          disabled={submitting}
          className="sm:mt-[22px]"
        >
          {submitting && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {t("account.email.send")}
        </Button>
      </form>
      {needsSignIn && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => void signOut("/settings")}
        >
          {t("account.email.signInAgainAction")}
        </Button>
      )}
    </Section>
  );
}

function FeedbackSection() {
  const t = useI18n();
  return (
    <Section
      title={t("feedback.title")}
      description={t("feedback.description")}
    >
      <SendFeedback />
    </Section>
  );
}

function LeaveSection() {
  const t = useI18n();
  const signOut = useSignOut();
  const [deleting, setDeleting] = useState(false);
  return (
    <Section
      title={t("account.danger.title")}
      description={t("account.danger.deleteWarning")}
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void signOut()}>
          {t("account.danger.signOut")}
        </Button>
        <Button variant="destructive" onClick={() => setDeleting(true)}>
          {t("account.danger.delete")}
        </Button>
      </div>
      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </Section>
  );
}
