"use client";

import { errorText } from "@/lib/form-errors";
import { Field } from "@coinslite/ui/field";
import { Input, type InputProps } from "@coinslite/ui/input";
import { useId } from "react";

/** The parts of a TanStack Form field this component reads. */
type FormFieldApi = {
  name: string;
  state: { value: string; meta: { errors: unknown[] } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

/**
 * A labelled text input bound to a form field. Errors show once the form has
 * been submitted, then update as the user types; an error takes the hint's
 * place, so the two never say the same thing twice.
 */
export function TextField({
  field,
  label,
  hint,
  labelAction,
  showErrors,
  inputRef,
  ...input
}: {
  field: FormFieldApi;
  inputRef?: React.Ref<HTMLInputElement>;
  label: string;
  hint?: string;
  labelAction?: React.ReactNode;
  showErrors: boolean;
} & Omit<InputProps, "id" | "name" | "value" | "onChange" | "onBlur">) {
  const id = useId();
  const error = showErrors ? errorText(field.state.meta.errors) : undefined;
  return (
    <Field
      id={id}
      label={label}
      hint={error ? undefined : hint}
      error={error}
      labelAction={labelAction}
    >
      {(control) => (
        <Input
          {...control}
          {...input}
          ref={inputRef}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
    </Field>
  );
}
