"use client";

import { nextQuery } from "@/lib/next-path";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { normalizeEmail } from "@coinslite/backend/convex/accounts/credentials";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import Link from "next/link";
import { useState } from "react";
import { AuthForm, SubmitButton } from "./auth-form";
import {
  AuthPanel,
  FormMessage,
  type FormMessageState,
  authLink,
} from "./auth-panel";
import { ResendCodeButton } from "./code-step";
import { TextField } from "./text-field";
import { useAuthSchemas, useSubmitState } from "./use-auth-form";
import { type AuthStepResult, useAuthStep } from "./use-auth-step";

/**
 * Sign in, or sign up, with a link emailed to the address. The link opens the
 * verify page; new accounts then finish setting up on /welcome.
 */
export function LinkSignInFlow({ next }: { next: string }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const attempt = useAuthStep("magic-link");
  const schemas = useAuthSchemas();
  const [sentTo, setSentTo] = useState<string>();
  const [message, setMessage] = useState<FormMessageState>();

  // The link returns to /welcome in the language on screen: a new account has none yet.
  const send = (email: string): Promise<AuthStepResult> =>
    attempt({ email, redirectTo: `/${locale}/welcome${nextQuery(next)}` });

  const form = useForm({
    defaultValues: { email: "" },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const email = normalizeEmail(value.email);
      if ((await send(email)) === "failed") {
        setMessage({ tone: "error", text: t("auth.failedGeneric") });
      } else {
        setMessage(undefined);
        setSentTo(email);
      }
    },
  });
  const { submitted, submitting } = useSubmitState(form);

  const footer = (
    <Link href={`/login${nextQuery(next)}`} className={authLink}>
      {t("auth.link.usePassword")}
    </Link>
  );

  if (sentTo) {
    return (
      <AuthPanel
        title={t("auth.link.sentTitle")}
        description={t("auth.link.sent", { email: sentTo })}
        footer={footer}
      >
        {message && (
          <FormMessage tone={message.tone}>{message.text}</FormMessage>
        )}
        <ResendCodeButton
          email={sentTo}
          resend={() => send(sentTo)}
          onResult={setMessage}
          isLink
        />
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title={t("auth.link.title")}
      description={t("auth.link.description")}
      footer={footer}
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
        {message && (
          <FormMessage tone={message.tone}>{message.text}</FormMessage>
        )}
        <SubmitButton submitting={submitting}>
          {t("auth.link.submit")}
        </SubmitButton>
      </AuthForm>
    </AuthPanel>
  );
}
