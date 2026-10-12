"use client";

import { type SubmittableForm, submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { useSelector } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import type { FormStore } from "./use-auth-form";

/**
 * The form around each auth step. Its fields stay disabled until the page is
 * interactive: typing before then would be lost, and an early submit would fall
 * back to a plain form post.
 */
export function AuthForm({
  form,
  children,
}: {
  form: SubmittableForm & FormStore<{ isDirty: boolean }>;
  children: React.ReactNode;
}) {
  const t = useI18n();
  // A new deployment waits while someone is typing here.
  useUnsavedInput(useSelector(form.store, (state) => state.isDirty));
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submitForm(form, t("common.saveFailed"), event.currentTarget);
      }}
    >
      <fieldset disabled={!interactive} className="flex min-w-0 flex-col gap-4">
        {children}
      </fieldset>
    </form>
  );
}

/** The step's main button, with a spinner while it's being sent. */
export function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean;
  children: string;
}) {
  return (
    <Button type="submit" disabled={submitting} className="w-full">
      {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}
