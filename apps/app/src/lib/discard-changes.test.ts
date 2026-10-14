import { describe, expect, test } from "bun:test";
import { asksBeforeClosing, formChanged, heldInput } from "./discard-changes";

describe("formChanged", () => {
  const album = { name: "Norway", description: "", colour: "blue" };

  test("a name typed and deleted again is no change", () => {
    expect(
      formChanged(
        { isDirty: true, values: { ...album, name: "Norway" } },
        album,
      ),
    ).toBe(false);
  });

  test("an Album preselected on an untouched form is no change", () => {
    const blankItem = { title: "", albumId: undefined as string | undefined };
    expect(
      formChanged(
        { isDirty: false, values: { ...blankItem, albumId: "album1" } },
        blankItem,
      ),
    ).toBe(false);
  });

  test("a new colour is a change", () => {
    expect(
      formChanged(
        { isDirty: true, values: { ...album, colour: "red" } },
        album,
      ),
    ).toBe(true);
  });
});

describe("asksBeforeClosing", () => {
  test("closing a form with changes asks first", () => {
    expect(asksBeforeClosing({ open: false, changed: true })).toBe(true);
  });

  test("an unchanged form closes straight away", () => {
    expect(asksBeforeClosing({ open: false, changed: false })).toBe(false);
  });

  test("a form that keeps its draft when closed, like New Item, closes straight away", () => {
    expect(
      asksBeforeClosing({ open: false, changed: true, keepsDraft: true }),
    ).toBe(false);
  });

  test("Cancel in a form that keeps its draft asks, since it drops the draft", () => {
    expect(
      asksBeforeClosing({
        open: false,
        changed: true,
        keepsDraft: true,
        discarding: true,
      }),
    ).toBe(true);
  });

  test("Cancel in an unchanged form closes straight away", () => {
    expect(
      asksBeforeClosing({
        open: false,
        changed: false,
        keepsDraft: true,
        discarding: true,
      }),
    ).toBe(false);
  });

  test("opening never asks", () => {
    expect(asksBeforeClosing({ open: true, changed: true })).toBe(false);
  });
});

describe("heldInput", () => {
  const defaults = { title: "", country: undefined as string | undefined };
  const edited =
    (...names: string[]) =>
    (name: string) =>
      names.includes(name);

  test("a field the person edited to something new is input", () => {
    expect(
      heldInput({ ...defaults, title: "1 krone" }, defaults, edited("title")),
    ).toBe(true);
  });

  test("typing something and deleting it again isn't", () => {
    expect(heldInput(defaults, defaults, edited("title"))).toBe(false);
  });

  test("a value filled in for the person isn't", () => {
    expect(heldInput({ ...defaults, country: "NO" }, defaults, edited())).toBe(
      false,
    );
  });
});
