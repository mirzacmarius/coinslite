import { toast } from "@coinslite/ui/toaster";

/** The parts of a TanStack form that submitting uses. */
export type SubmittableForm = {
  validateAllFields: (cause: "submit") => Promise<unknown>;
  handleSubmit: () => Promise<void>;
  state: { isValid: boolean };
};

/**
 * Submits a TanStack form after validating every field. On its own, TanStack
 * skips untouched fields once any field has an error; this shows every problem at once.
 * When a field stops the submit, the first one showing an error scrolls into
 * view and takes focus. `from` is where the submit came from: the form, a
 * button in it, or the dialog around it.
 *
 * A form's own submit handler shows the failures it expects. Anything else
 * that throws while validating or saving shows `failed`, so pressing a submit
 * button never does nothing.
 */
export async function submitForm(
  form: SubmittableForm,
  failed: string,
  from: Element,
) {
  try {
    await form.validateAllFields("submit");
    await form.handleSubmit();
  } catch (error) {
    console.error(error);
    toast.error(failed);
    return;
  }
  if (!form.state.isValid) focusFirstInvalid(from.closest("form") ?? from);
}

/**
 * Focuses the first field marked invalid, centred so its error shows too, as
 * on a phone sheet. Two frames on, React has drawn the errors and opened any
 * section that holds one.
 */
function focusFirstInvalid(fields: Element) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const field = [
        ...fields.querySelectorAll<HTMLElement>('[aria-invalid="true"]'),
      ].find((element) => element.getClientRects().length > 0);
      if (!field) return;
      field.scrollIntoView({ block: "center" });
      field.focus({ preventScroll: true });
    }),
  );
}
