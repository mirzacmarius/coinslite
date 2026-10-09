/** The parts of a TanStack form that submitting uses. */
export type SubmittableForm = {
  validateAllFields: (cause: "submit") => Promise<unknown>;
  handleSubmit: () => Promise<void>;
};

/**
 * Submits a TanStack form after validating every field. On its own, TanStack
 * skips untouched fields once any field has an error; this shows every problem at once.
 */
export async function submitForm(form: SubmittableForm) {
  await form.validateAllFields("submit");
  await form.handleSubmit();
}
