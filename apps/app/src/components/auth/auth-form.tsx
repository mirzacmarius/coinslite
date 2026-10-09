"use client";

import { Button } from "@coinslite/ui/button";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";

/** The parts of a TanStack form that submitting uses. */
type SubmittableForm = {
  validateAllFields: (cause: "submit") => Promise<unknown>;
  handleSubmit: () => Promise<void>;
};

/**
 * The form around each auth step. Its fields stay disabled until the page is
 * interactive: typing before then would be lost, and an early submit would fall
 * back to a plain form post.
 */
export function AuthForm({
  form,
  children,
}: {
  form: SubmittableForm;
  children: React.ReactNode;
}) {
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  return (
    <form
      method="post"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        // TanStack skips validating untouched fields once any field has an
        // error; validate them all so every problem shows at once.
        await form.validateAllFields("submit");
        await form.handleSubmit();
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
}: { submitting: boolean; children: string }) {
  return (
    <Button type="submit" disabled={submitting} className="w-full">
      {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}
