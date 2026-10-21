"use client";

import {
  PlanLink,
  SubscriptionSummary,
} from "@/components/billing/account-plan";
import { InsuranceReportLink } from "@/components/insurance-report/insurance-report-link";
import { AppearancePicker, PalettePicker } from "@/components/preferences";
import { PhoneAccountLinks } from "@/components/shell/phone-account-links";
import { useSignOut } from "@/components/sign-out";
import { UpdatesLink } from "@/components/updates/updates-link";
import { formChanged } from "@/lib/discard-changes";
import { errorText } from "@/lib/form-errors";
import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { contactLimits } from "@coinslite/backend/convex/account/rules";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { type CountryCode, countryCodes, formatCountry } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import {
  SettingsBlock,
  SettingsGroup,
  SettingsRow,
} from "@coinslite/ui/settings-group";
import { toast } from "@coinslite/ui/toaster";
import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { ChevronRight, Globe, Loader2, Trash2 } from "lucide-react";
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
          <p className="text-ui text-muted-foreground">{account.email}</p>
        )}
        <SubscriptionSummary />
      </header>
      <div className="flex flex-col rounded-xl bg-card p-1">
        <PlanLink plan={account.plan} />
        <DeleteAccountLink />
        <PhoneAccountLinks />
        <UpdatesLink />
        <InsuranceReportLink premium={account.plan === "premium"} />
      </div>
      <ContactSection account={account} />
      <PreferencesSection account={account} />
      <EmailSection account={account} />
      <FeedbackSection />
      <LeaveSection />
    </>
  );
}

function ContactSection({ account }: { account: Account }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const updateContact = useMutation(api.account.updateContact);
  const [failed, setFailed] = useState(false);
  // Folded to a summary until opened: most visits are for other settings.
  const [open, setOpen] = useState(false);
  const countryOptions = useMemo(
    () =>
      countryCodes
        .map((code) => ({ value: code, label: formatCountry(code, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );
  // The details as stored; an untouched form follows them.
  const stored = {
    displayName: account.displayName ?? "",
    fullName: account.fullName ?? "",
    streetAddress: account.streetAddress ?? "",
    postalCode: account.postalCode ?? "",
    city: account.city ?? "",
    country: account.country as CountryCode | undefined,
    contactPhone: account.contactPhone ?? "",
  };
  // The details last sent, as typed: the stored copy is trimmed.
  const [sent, setSent] = useState(stored);
  const form = useForm({
    defaultValues: stored,
    onSubmit: async ({ value }) => {
      setFailed(false);
      try {
        await updateContact(value);
        toast.success(t("account.contact.saved"));
        setSent(value);
      } catch {
        setFailed(true);
      }
    },
  });
  const submitted = useSelector(
    form.store,
    (state) => state.submissionAttempts > 0,
  );
  const submitting = useSelector(form.store, (state) => state.isSubmitting);
  // A new deployment's reload waits while the details differ from both.
  useUnsavedInput(
    useSelector(
      form.store,
      (state) => formChanged(state, stored) && formChanged(state, sent),
    ),
  );
  const errorOf = (errors: unknown[]) =>
    submitted ? errorText(errors) : undefined;
  // The summary while folded: who, then where, as stored.
  const name = stored.fullName.trim() || stored.displayName.trim();
  const place = [
    stored.streetAddress,
    [stored.postalCode, stored.city].filter(Boolean).join(" "),
    stored.country && formatCountry(stored.country, locale),
  ]
    .filter(Boolean)
    .join(", ");

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
      rule?: z.ZodType<string, string>;
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
    <SettingsGroup
      title={t("account.contact.title")}
      description={t("account.contact.description")}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group flex w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-ui font-medium">
              {name || t("account.contact.empty")}
            </span>
            {place && (
              <span className="truncate text-xs text-muted-foreground">
                {place}
              </span>
            )}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SettingsBlock className="pt-1">
            <form
              method="post"
              noValidate
              className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(
                  form,
                  t("common.saveFailed"),
                  event.currentTarget,
                );
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
                  <Field
                    id="account-country"
                    label={t("account.contact.country")}
                  >
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
                      !phone.trim() ||
                      /^\+?[0-9][0-9 ()./-]*$/.test(phone.trim()),
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
          </SettingsBlock>
        </CollapsibleContent>
      </Collapsible>
    </SettingsGroup>
  );
}

function PreferencesSection({ account }: { account: Account }) {
  const t = useI18n();
  const currencyHintId = useId();
  const appearanceHintId = useId();
  const coloursHintId = useId();
  return (
    <SettingsGroup title={t("account.preferences.title")}>
      <SettingsRow
        label={t("account.preferences.language")}
        description={t("account.preferences.languageHint")}
      >
        <LanguagePicker />
      </SettingsRow>
      <SettingsRow
        label={t("account.preferences.homeCurrency")}
        description={t("homeCurrency.hint")}
        descriptionId={currencyHintId}
      >
        <HomeCurrencySetting
          current={account.homeCurrency}
          hintId={currencyHintId}
        />
      </SettingsRow>
      <SettingsRow
        label={t("shell.appearance")}
        description={t("account.preferences.appearanceHint")}
        descriptionId={appearanceHintId}
      >
        <AppearancePicker describedBy={appearanceHintId} />
      </SettingsRow>
      <SettingsRow
        label={t("shell.colours")}
        description={t("account.preferences.coloursHint")}
        descriptionId={coloursHintId}
      >
        <PalettePicker describedBy={coloursHintId} />
      </SettingsRow>
    </SettingsGroup>
  );
}

const emailErrorKeys = {
  INVALID_EMAIL: "account.email.invalid",
  SAME_EMAIL: "account.email.same",
  SIGN_IN_AGAIN: "account.email.signInAgain",
  TOO_MANY_REQUESTS: "account.email.tooMany",
} as const;

/** The change-email form before anything is typed. */
const noNewEmail = { newEmail: "" };

function EmailSection({ account }: { account: Account }) {
  const t = useI18n();
  const requestEmailChange = useMutation(api.account.requestEmailChange);
  const signOut = useSignOut();
  const [error, setError] = useState<string>();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const form = useForm({
    defaultValues: noNewEmail,
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
  const submitted = useSelector(
    form.store,
    (state) => state.submissionAttempts > 0,
  );
  const submitting = useSelector(form.store, (state) => state.isSubmitting);
  useUnsavedInput(
    useSelector(form.store, (state) => formChanged(state, noNewEmail)),
  );

  return (
    <SettingsGroup
      title={t("account.email.title")}
      description={t("account.email.current", { email: account.email ?? "" })}
    >
      <SettingsBlock className="flex flex-col gap-3">
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
            void submitForm(form, t("common.saveFailed"), event.currentTarget);
          }}
        >
          <form.Field
            name="newEmail"
            validators={{
              onChange: z
                .string()
                .trim()
                .pipe(z.email(t("account.email.invalid"))),
            }}
          >
            {(field) => (
              <Field
                id="account-new-email"
                label={t("account.email.newEmail")}
                error={
                  (submitted && errorText(field.state.meta.errors)) || error
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
            className="sm:mt-[1.375rem]"
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
      </SettingsBlock>
    </SettingsGroup>
  );
}

function FeedbackSection() {
  const t = useI18n();
  return (
    <SettingsGroup
      title={t("feedback.title")}
      description={t("feedback.description")}
    >
      <SettingsBlock>
        <SendFeedback />
      </SettingsBlock>
    </SettingsGroup>
  );
}

function LeaveSection() {
  const t = useI18n();
  const signOut = useSignOut();
  return (
    <SettingsGroup title={t("account.danger.title")}>
      <SettingsBlock className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void signOut()}>
          {t("account.danger.signOut")}
        </Button>
      </SettingsBlock>
    </SettingsGroup>
  );
}

/**
 * Deleting the account, beside Manage subscription: a subscription that
 * would renew is cancelled there first (DeleteAccountDialog).
 */
function DeleteAccountLink() {
  const t = useI18n();
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <button
        type="button"
        className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-ui font-medium text-destructive transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setDeleting(true)}
      >
        <Trash2
          className="size-4 shrink-0"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("account.danger.delete")}
      </button>
      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </>
  );
}
