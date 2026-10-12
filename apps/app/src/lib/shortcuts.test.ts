import { describe, expect, test } from "bun:test";
import { type KeyPress, type PageNow, shortcutFires } from "./shortcuts";

/** A key pressed with no modifier held. */
const press = (key: string, held: Partial<KeyPress> = {}): KeyPress => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...held,
});

/** Nothing has the keyboard: no text field, dialog or menu. */
const idle: PageNow = { typing: false, dialogOpen: false, menuOpen: false };

describe("a single-key shortcut", () => {
  test("fires on its key, in either case", () => {
    expect(shortcutFires("c", press("c"), idle)).toBe(true);
    expect(shortcutFires("c", press("C", { shiftKey: true }), idle)).toBe(true);
  });

  test("leaves other keys alone", () => {
    expect(shortcutFires("c", press("e"), idle)).toBe(false);
  });

  test("leaves Cmd, Ctrl and Alt combinations to the browser", () => {
    expect(shortcutFires("c", press("c", { metaKey: true }), idle)).toBe(false);
    expect(shortcutFires("c", press("c", { ctrlKey: true }), idle)).toBe(false);
    expect(shortcutFires("/", press("/", { altKey: true }), idle)).toBe(false);
  });

  test("fires on a character typed with Shift, as / is on some keyboards", () => {
    expect(shortcutFires("/", press("/", { shiftKey: true }), idle)).toBe(true);
  });

  test("an arrow doesn't fire with Shift held, which extends a selection", () => {
    expect(shortcutFires("ArrowLeft", press("ArrowLeft"), idle)).toBe(true);
    expect(
      shortcutFires("ArrowLeft", press("ArrowLeft", { shiftKey: true }), idle),
    ).toBe(false);
  });
});

describe("a Cmd/Ctrl shortcut", () => {
  test("fires with Cmd on a Mac or Ctrl elsewhere", () => {
    expect(shortcutFires("mod+a", press("a", { metaKey: true }), idle)).toBe(
      true,
    );
    expect(
      shortcutFires("mod+Enter", press("Enter", { ctrlKey: true }), idle),
    ).toBe(true);
  });

  test("doesn't fire on its key alone", () => {
    expect(shortcutFires("mod+a", press("a"), idle)).toBe(false);
    expect(shortcutFires("mod+Enter", press("Enter"), idle)).toBe(false);
  });

  test("fires with Caps Lock or Shift on too", () => {
    expect(
      shortcutFires(
        "mod+a",
        press("A", { metaKey: true, shiftKey: true }),
        idle,
      ),
    ).toBe(true);
  });
});

describe("no shortcut fires while something else has the keyboard", () => {
  const busy: Record<string, PageNow> = {
    "someone is typing": { ...idle, typing: true },
    "a dialog is open": { ...idle, dialogOpen: true },
    "a menu is open": { ...idle, menuOpen: true },
  };
  for (const [when, page] of Object.entries(busy)) {
    test(`not while ${when}`, () => {
      expect(shortcutFires("c", press("c"), page)).toBe(false);
      expect(shortcutFires("Escape", press("Escape"), page)).toBe(false);
      expect(
        shortcutFires("mod+Enter", press("Enter", { metaKey: true }), page),
      ).toBe(false);
    });
  }
});
