/** What a TanStack form's state says about changes: whether anyone edited it, and its values. */
export type EditedForm<Values> = { isDirty: boolean; values: Values };

/** Whether two form values are the same: lists (an Item's tags) item by item. */
const sameValue = (a: unknown, b: unknown) =>
  Object.is(a, b) ||
  (Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((value, index) => Object.is(value, b[index])));

/**
 * Whether a form holds changes: someone edited it, and a value now differs
 * from `defaults`, the values it started from. Typing something and deleting
 * it again is no change, nor is ticking a tag and unticking it, nor a value
 * filled in for the person, such as a preselected Album.
 */
export function formChanged<Values extends object>(
  { isDirty, values }: EditedForm<Values>,
  defaults: Values,
) {
  return (
    isDirty &&
    (Object.keys(values) as (keyof Values)[]).some(
      (name) => !sameValue(values[name], defaults[name]),
    )
  );
}

/** A dialog asked to open or close, and what closing would do to its form. */
export type CloseRequest = {
  /** What the dialog is asked to become: false when it's asked to close. */
  open: boolean;
  /** Whether the form holds input that hasn't been saved. */
  changed: boolean;
};

/**
 * Whether a form's dialog asks "Discard changes?" before doing what it's
 * asked: only when closing would lose input.
 */
export function asksBeforeClosing({ open, changed }: CloseRequest) {
  return !open && changed;
}
