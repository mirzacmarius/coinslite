/** The parts of a key press a shortcut reads. */
export type KeyPress = Pick<
  KeyboardEvent,
  "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
>;

/** What has the keyboard when a key is pressed. */
export type PageNow = {
  /** The key lands in a text field. */
  typing: boolean;
  /** A dialog has the keyboard. */
  dialogOpen: boolean;
  /** A menu or list of options has the keyboard. */
  menuOpen: boolean;
};

/**
 * Whether pressing `press` runs `shortcut`, the one rule every keyboard
 * shortcut in the app follows: none fires while someone is typing, a dialog
 * is open or a menu is open.
 *
 * `shortcut` is a key as `KeyboardEvent.key` names it, in any case: "c", "/",
 * "ArrowLeft", "Escape". A key on its own fires only without Cmd, Ctrl or Alt;
 * Shift may be held, as it is for "/" on some keyboards, except with an arrow,
 * where Shift extends a selection. "mod+a" or "mod+Enter" fires with Cmd on a
 * Mac or Ctrl elsewhere.
 */
export function shortcutFires(
  shortcut: string,
  press: KeyPress,
  page: PageNow,
) {
  if (page.typing || page.dialogOpen || page.menuOpen) return false;
  const withMod = shortcut.startsWith("mod+");
  const key = withMod ? shortcut.slice("mod+".length) : shortcut;
  if (press.key.toLowerCase() !== key.toLowerCase()) return false;
  if (withMod) return press.metaKey || press.ctrlKey;
  if (press.metaKey || press.ctrlKey || press.altKey) return false;
  return !(press.shiftKey && key.startsWith("Arrow"));
}
