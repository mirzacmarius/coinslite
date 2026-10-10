import { toast } from "@coinslite/ui/toaster";

/** The parts of a TanStack form that submitting uses. */
export type SubmittableForm = {
  validateAllFields: (cause: "submit") => Promise<unknown>;
  handleSubmit: () => Promise<void>;
};

/**
 * Submits a TanStack form after validating every field. On its own, TanStack
 * skips untouched fields once any field has an error; this shows every problem at once.
 *
 * A form's own submit handler shows the failures it expects. Anything else
 * that throws while validating or saving shows `failed`, so pressing a submit
 * button never does nothing.
 */
export async function submitForm(form: SubmittableForm, failed: string) {
  try {
    await form.validateAllFields("submit");
    await form.handleSubmit();
  } catch (error) {
    console.error(error);
    toast.error(failed);
  }
}
