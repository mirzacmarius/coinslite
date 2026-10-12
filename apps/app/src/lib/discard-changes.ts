/** A dialog asked to open or close, and what closing would do to its form. */
export type CloseRequest = {
  /** What the dialog is asked to become: false when it's asked to close. */
  open: boolean;
  /** Whether the form holds input that hasn't been saved. */
  changed: boolean;
  /** Whether closing keeps the input for next time, as the New Item dialog does. */
  keepsDraft?: boolean;
};

/**
 * Whether a form's dialog asks "Discard changes?" before doing what it's
 * asked: only when closing would lose input.
 */
export function asksBeforeClosing({
  open,
  changed,
  keepsDraft = false,
}: CloseRequest) {
  return !open && changed && !keepsDraft;
}
