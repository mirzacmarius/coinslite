import { describe, expect, test } from "bun:test";
import {
  hasUnsavedInput,
  onUnsavedInputChange,
  registerUnsavedInput,
  releaseAllUnsavedInput,
} from "./unsaved-input";

describe("unsaved input", () => {
  test("a form holds unsaved input from registering until it's released", () => {
    expect(hasUnsavedInput()).toBe(false);
    const release = registerUnsavedInput();
    expect(hasUnsavedInput()).toBe(true);
    release();
    expect(hasUnsavedInput()).toBe(false);
  });

  test("releasing one form, even twice, leaves another form's input held", () => {
    const releaseContact = registerUnsavedInput();
    const releaseEmail = registerUnsavedInput();
    releaseContact();
    releaseContact();
    expect(hasUnsavedInput()).toBe(true);
    releaseEmail();
    expect(hasUnsavedInput()).toBe(false);
  });

  test("listeners hear when a form starts and stops holding input", () => {
    const heard: boolean[] = [];
    const stop = onUnsavedInputChange(() => heard.push(hasUnsavedInput()));
    const release = registerUnsavedInput();
    release();
    stop();
    expect(heard).toEqual([true, false]);
  });

  test("leaving the page on purpose lets go of every form's input", () => {
    registerUnsavedInput();
    registerUnsavedInput();
    const heard: boolean[] = [];
    const stop = onUnsavedInputChange(() => heard.push(hasUnsavedInput()));
    releaseAllUnsavedInput();
    stop();
    expect(hasUnsavedInput()).toBe(false);
    expect(heard).toEqual([false]);
  });
});
