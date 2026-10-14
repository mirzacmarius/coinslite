/** What a TanStack form's state says about changes: whether anyone edited it, and its values. */
export type EditedForm<Values> = { isDirty: boolean; values: Values };

/**
 * Whether a form holds changes: someone edited it, and a value now differs
 * from `defaults`, the values it started from. Typing something and deleting
 * it again is no change, nor is a value filled in for the person, such as a
 * preselected Album.
 */
export function formChanged<Values extends object>(
  { isDirty, values }: EditedForm<Values>,
  defaults: Values,
) {
  return (
    isDirty &&
    (Object.keys(values) as (keyof Values)[]).some(
      (name) => !Object.is(values[name], defaults[name]),
    )
  );
}

/**
 * Whether someone typed or picked something in a form: a field they edited
 * (`edited`) now holds something other than its default. Values filled in for
 * the person without marking the field edited, such as a preselected Album or
 * the pills "Create more" carries over, don't count.
 */
export function heldInput<Values extends object>(
  values: Values,
  defaults: Values,
  edited: (name: keyof Values) => boolean,
) {
  return (Object.keys(values) as (keyof Values)[]).some(
    (name) => edited(name) && !Object.is(values[name], defaults[name]),
  );
}

/** A dialog asked to open or close, and what closing would do to its form. */
export type CloseRequest = {
  /** What the dialog is asked to become: false when it's asked to close. */
  open: boolean;
  /** Whether the form holds input that hasn't been saved. */
  changed: boolean;
  /** Whether closing keeps the input for next time, as the New Item dialog does. */
  keepsDraft?: boolean;
  /** Cancel: closing drops the input, even where closing otherwise keeps it as a draft. */
  discarding?: boolean;
};

/**
 * Whether a form's dialog asks "Discard changes?" before doing what it's
 * asked: only when closing would lose input.
 */
export function asksBeforeClosing({
  open,
  changed,
  keepsDraft = false,
  discarding = false,
}: CloseRequest) {
  return !open && changed && (!keepsDraft || discarding);
}
