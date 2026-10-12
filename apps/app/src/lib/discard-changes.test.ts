import { describe, expect, test } from "bun:test";
import { asksBeforeClosing } from "./discard-changes";

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

  test("opening never asks", () => {
    expect(asksBeforeClosing({ open: true, changed: true })).toBe(false);
  });
});
