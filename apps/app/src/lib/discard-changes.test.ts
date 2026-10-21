import { describe, expect, test } from "bun:test";
import { asksBeforeClosing, formChanged } from "./discard-changes";

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

  test("opening never asks", () => {
    expect(asksBeforeClosing({ open: true, changed: true })).toBe(false);
  });
});
